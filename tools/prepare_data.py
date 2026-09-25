#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
豬絲馬跡 — 資料準備管線 (static dataset builder)

Reads wild boar capture-action records and produces the static datasets
served by the website (data/*.json, data/sightings.geojson).

Pipeline:
  1. Parse the AFCD "Wild Pig Nuisance" page (itemized capture actions), or a
     locally saved copy of the page.
  2. Optionally merge a legacy CSV export (date, latitude, longitude,
     description) from the original MySQL-based pipeline.
  3. De-duplicate records.
  4. Geocode location names via OpenStreetMap Nominatim (forward search for
     coordinates, reverse search for the 18-district name), with a local JSON
     cache so repeat runs make no network calls.
  5. Aggregate statistics and recency-based activity levels.
  6. Write data/sightings.geojson, data/statistics.json, data/meta.json,
     data/districts.json.

Standard library only. Run from the repository root:

    python tools/prepare_data.py --legacy-csv path/to/mysql_coordinates.csv

Network etiquette: Nominatim requests are spaced >= 1.1 s apart and the first
run typically needs a few minutes; later runs are fully cached and offline.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
TOOLS_DIR = Path(__file__).resolve().parent
GEOCODE_CACHE = TOOLS_DIR / "geocode_cache.json"

AFCD_URL = (
    "https://www.afcd.gov.hk/tc_chi/conservation/con_fau/"
    "con_fau_nui/con_fau_nui_pig/con_fau_nui_pig.html"
)
NOMINATIM = "https://nominatim.openstreetmap.org"
USER_AGENT = "hk-wild-boar-traces/1.0 (open data preparation; static site builder)"

# Hong Kong's 18 districts, traditional Chinese -> English. The Chinese key is
# what Nominatim returns in the "suburb" field for locations inside the district.
DISTRICTS_ZH_EN = {
    "中西區": "Central and Western",
    "灣仔區": "Wan Chai",
    "東區": "Eastern",
    "南區": "Southern",
    "油尖旺區": "Yau Tsim Mong",
    "深水埗區": "Sham Shui Po",
    "九龍城區": "Kowloon City",
    "黃大仙區": "Wong Tai Sin",
    "觀塘區": "Kwun Tong",
    "北區": "North",
    "大埔區": "Tai Po",
    "沙田區": "Sha Tin",
    "西貢區": "Sai Kung",
    "荃灣區": "Tsuen Wan",
    "屯門區": "Tuen Mun",
    "元朗區": "Yuen Long",
    "葵青區": "Kwai Tsing",
    "離島區": "Islands",
}

# Recency-based activity levels, relative to the latest record in the dataset.
# Same 30/90/180-day thresholds the original QGIS viewer used for symbology.
ACTIVITY_LEVELS = [
    {
        "key": "high",
        "label": "高活動",
        "label_en": "Higher activity",
        "color": "#c0392b",
        "max_days": 30,
        "description": "最近 30 天內曾有行動紀錄",
        "description_en": "Captured within the last 30 days",
    },
    {
        "key": "medium",
        "label": "中度活動",
        "label_en": "Moderate activity",
        "color": "#e67e22",
        "max_days": 90,
        "description": "最近 31–90 天內曾有行動紀錄",
        "description_en": "Captured 31–90 days ago",
    },
    {
        "key": "low",
        "label": "低度活動",
        "label_en": "Lower activity",
        "color": "#f1c40f",
        "max_days": 180,
        "description": "最近 91–180 天內曾有行動紀錄",
        "description_en": "Captured 91–180 days ago",
    },
    {
        "key": "past",
        "label": "較早紀錄",
        "label_en": "Earlier records only",
        "color": "#909497",
        "max_days": None,
        "description": "最近一次行動已超過 180 天",
        "description_en": "Last capture more than 180 days ago",
    },
]

HK_BBOX = (22.13, 113.82, 22.58, 114.45)  # lat/lon sanity window for geocoding

# Spelling variants on the official page that refer to the same place.
NAME_ALIASES = {
    "司徙拔道": "司徒拔道",  # official page typo,Stubbs Road
}


def normalize_name(name: str) -> str:
    return NAME_ALIASES.get(name, name)


def log(msg: str) -> None:
    print(msg, flush=True)


def fetch_url(url: str, timeout: int = 45) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def parse_iso_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


# --------------------------------------------------------------------------
# Step 1-2: record sources
# --------------------------------------------------------------------------

def parse_afcd_page(html: str) -> tuple[list[dict], dict | None]:
    """Extract itemized action rows and the historical aggregate from the page.

    Returns (records, historical_context). Records use the same fields as the
    original scraper: action_number, action_date, location_name, boar_count.
    """
    text = re.sub(r"<[^>]+>", " ", html)
    text = text.replace("&nbsp;", " ")

    records: list[dict] = []
    seen: set[tuple] = set()
    pattern = re.compile(r"(\d{1,4})\.\s*(\d{4}年\d{1,2}月\d{1,2}日)\s+([^\s]+)\s+(\d{1,3})")
    for num, date_str, location, count in pattern.findall(text):
        try:
            iso = datetime.strptime(date_str, "%Y年%m月%d日").strftime("%Y-%m-%d")
        except ValueError:
            continue
        key = (num, iso, location)
        if key in seen:
            continue
        seen.add(key)
        records.append(
            {
                "action_number": num,
                "action_date": iso,
                "location_name": normalize_name(location),
                "boar_count": int(count),
            }
        )

    historical = None
    agg = re.search(
        r"共([\d,]+)\s*次捕捉行動[^共]*共(?:人道處理了)?\s*([\d,]+)\s*頭", text
    )
    period = re.search(r"(\d{4}年\d{1,2}月)\s*至\s*(\d{4}年\d{1,2}月)", text)
    if agg:
        historical = {
            "actions": int(agg.group(1).replace(",", "")),
            "boars": int(agg.group(2).replace(",", "")),
            "period": f"{period.group(1)}至{period.group(2)}" if period else None,
        }
    return records, historical


LEGACY_DESC = re.compile(r"^(.*?)\s*[（(]\s*(\d+)\s*[頭头]?\s*[)）]\s*$")


def parse_legacy_csv(path: Path) -> list[dict]:
    """Parse the legacy MySQL export: date, latitude, longitude, description."""
    records: list[dict] = []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            try:
                iso = parse_iso_date(row["date"].strip()).strftime("%Y-%m-%d")
                lat = round(float(row["latitude"]), 6)
                lon = round(float(row["longitude"]), 6)
            except (KeyError, ValueError):
                continue
            desc = (row.get("description") or "").strip()
            match = LEGACY_DESC.match(desc)
            location = normalize_name(match.group(1).strip() if match else desc)
            count = int(match.group(2)) if match else 0
            records.append(
                {
                    "action_number": None,
                    "action_date": iso,
                    "location_name": location,
                    "boar_count": count,
                    "lat": lat,
                    "lon": lon,
                    "district": None,
                }
            )
    return records


# --------------------------------------------------------------------------
# Step 4: geocoding (Nominatim) with a local cache
# --------------------------------------------------------------------------

def load_cache() -> dict:
    if GEOCODE_CACHE.exists():
        with open(GEOCODE_CACHE, encoding="utf-8") as fh:
            return json.load(fh)
    return {}


def save_cache(cache: dict) -> None:
    with open(GEOCODE_CACHE, "w", encoding="utf-8") as fh:
        json.dump(cache, fh, ensure_ascii=False, indent=1, sort_keys=True)


def nominatim_json(path: str, params: dict) -> list | dict | None:
    url = f"{NOMINATIM}{path}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in (1, 2):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except Exception as exc:  # noqa: BLE001 - report and retry once
            log(f"  [WARN] Nominatim request failed ({exc}), attempt {attempt}")
            time.sleep(3 * attempt)
    return None


def in_hong_kong(lat: float, lon: float) -> bool:
    south, west, north, east = HK_BBOX[0], HK_BBOX[1], HK_BBOX[2], HK_BBOX[3]
    return south <= lat <= north and west <= lon <= east


def district_from_address(address: dict) -> str | None:
    suburb = address.get("suburb") or address.get("city_district") or ""
    suburb = suburb.strip()
    if suburb in DISTRICTS_ZH_EN:
        return suburb
    return None


def geocode_all(records: list[dict], offline: bool) -> None:
    """Fill in lat/lon/district for every unique location.

    Coordinates already present on records (e.g. the legacy CSV export) are
    seeded into the cache so they are preserved and only need a reverse lookup
    for the district name.
    """
    cache = load_cache()
    unique = sorted({r["location_name"] for r in records if r["location_name"]})

    # Seed the cache with coordinates already attached to records.
    for r in records:
        name = r["location_name"]
        if name and r.get("lat") is not None and not cache.get(name, {}).get("lat"):
            cache[name] = {
                "lat": r["lat"],
                "lon": r["lon"],
                "district": None,
                "address": "seeded from legacy CSV export",
            }

    pending = [name for name in unique if not cache.get(name, {}).get("lat")]
    log(f"[INFO] unique locations: {len(unique)}, to geocode: {len(pending)}")

    for i, name in enumerate(pending, 1):
        if offline:
            break
        entry: dict = {"lat": None, "lon": None, "district": None}
        # NOTE: no countrycodes parameter — it currently makes Nominatim
        # return empty results for Chinese queries; HK membership is instead
        # validated with the bounding box below.
        result = nominatim_json(
            "/search",
            {
                "q": f"{name}, 香港",
                "format": "jsonv2",
                "limit": 1,
                "addressdetails": 1,
                "accept-language": "zh-HK",
            },
        )
        time.sleep(1.1)
        if result:
            hit = result[0]
            lat, lon = float(hit["lat"]), float(hit["lon"])
            if in_hong_kong(lat, lon):
                entry["lat"], entry["lon"] = round(lat, 6), round(lon, 6)
                entry["address"] = hit.get("display_name", "")
                entry["district"] = district_from_address(hit.get("address", {}))
        if entry["lat"] is None:
            log(f"  [{i}/{len(pending)}] MISS  {name}")
        else:
            log(
                f"  [{i}/{len(pending)}] OK    {name} -> "
                f"{entry['lat']},{entry['lon']} ({entry['district'] or '未分區'})"
            )
        cache[name] = entry
        if i % 10 == 0:
            save_cache(cache)

    # Districts for locations that already had coordinates (legacy CSV rows).
    for name in unique:
        entry = cache.get(name)
        if not entry or not entry.get("lat") or entry.get("district"):
            continue
        if offline:
            break
        result = nominatim_json(
            "/reverse",
            {
                "lat": entry["lat"],
                "lon": entry["lon"],
                "format": "jsonv2",
                "zoom": 14,
                "accept-language": "zh-HK",
            },
        )
        time.sleep(1.1)
        if result:
            district = district_from_address(result.get("address", {}))
            if district:
                entry["district"] = district
                log(f"  [DISTRICT] {name} -> {district}")
    save_cache(cache)

    # Apply the cache to every record.
    for record in records:
        entry = cache.get(record["location_name"]) or {}
        record["lat"] = entry.get("lat")
        record["lon"] = entry.get("lon")
        record["district"] = entry.get("district")


# --------------------------------------------------------------------------
# Step 5: aggregation
# --------------------------------------------------------------------------

def activity_level(days_since_last: int | None) -> str:
    if days_since_last is None:
        return "past"
    for level in ACTIVITY_LEVELS:
        max_days = level["max_days"]
        if max_days is None or days_since_last <= max_days:
            return level["key"]
    return "past"


def build_outputs(records: list[dict], historical: dict | None) -> None:
    dated = [r for r in records if r.get("action_date")]
    dates = sorted(parse_iso_date(r["action_date"]) for r in dated)
    reference = dates[-1]

    # --- sightings.geojson -------------------------------------------------
    features = []
    for r in sorted(dated, key=lambda x: (x["action_date"], x["location_name"])):
        if r.get("lat") is None:
            continue
        d = parse_iso_date(r["action_date"])
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [r["lon"], r["lat"]],
                },
                "properties": {
                    "date": r["action_date"],
                    "year": d.year,
                    "month": f"{d.year}-{d.month:02d}",
                    "location": r["location_name"],
                    "district": r.get("district"),
                    "district_en": DISTRICTS_ZH_EN.get(r.get("district") or ""),
                    "count": r["boar_count"],
                    "action_number": r.get("action_number"),
                    "source": "AFCD",
                },
            }
        )
    geojson = {"type": "FeatureCollection", "features": features}

    # --- per-location aggregation (drives the activity indicator) ----------
    locations: dict[str, dict] = {}
    for r in dated:
        name = r["location_name"]
        entry = locations.setdefault(
            name,
            {
                "name": name,
                "district": r.get("district"),
                "lat": r.get("lat"),
                "lon": r.get("lon"),
                "records": 0,
                "boars": 0,
                "first_date": r["action_date"],
                "last_date": r["action_date"],
            },
        )
        entry["records"] += 1
        entry["boars"] += r["boar_count"]
        entry["first_date"] = min(entry["first_date"], r["action_date"])
        entry["last_date"] = max(entry["last_date"], r["action_date"])

    location_list = []
    for entry in locations.values():
        days = (reference - parse_iso_date(entry["last_date"])).days
        entry["days_since_last"] = days
        entry["activity"] = activity_level(days)
        location_list.append(entry)
    location_list.sort(key=lambda x: (-x["boars"], -x["records"], x["name"]))

    # --- monthly trend -----------------------------------------------------
    monthly: dict[str, dict] = {}
    for r in dated:
        d = parse_iso_date(r["action_date"])
        month = f"{d.year}-{d.month:02d}"
        bucket = monthly.setdefault(month, {"month": month, "records": 0, "boars": 0})
        bucket["records"] += 1
        bucket["boars"] += r["boar_count"]

    # --- district aggregation ----------------------------------------------
    by_district: dict[str, dict] = {}
    for r in dated:
        district = r.get("district")
        bucket = by_district.setdefault(
            district,
            {
                "district": district,
                "district_en": DISTRICTS_ZH_EN.get(district or ""),
                "records": 0,
                "boars": 0,
                "locations": set(),
            },
        )
        bucket["records"] += 1
        bucket["boars"] += r["boar_count"]
        bucket["locations"].add(r["location_name"])
    district_list = []
    for bucket in by_district.values():
        district_list.append({**bucket, "locations": len(bucket["locations"])})
    district_list.sort(key=lambda x: (-x["boars"], x["district"] or ""))

    # --- boars-per-action distribution --------------------------------------
    bands = [
        ("1", 1, 1),
        ("2-3", 2, 3),
        ("4-6", 4, 6),
        ("7+", 7, 10**9),
    ]
    count_bands = []
    for label, lo, hi in bands:
        hits = [r for r in dated if lo <= r["boar_count"] <= hi]
        count_bands.append(
            {
                "band": label,
                "records": len(hits),
                "boars": sum(r["boar_count"] for r in hits),
            }
        )

    districts_all = [
        {
            "zh": zh,
            "en": DISTRICTS_ZH_EN[zh],
            "records": next((d["records"] for d in district_list if d["district"] == zh), 0),
        }
        for zh in DISTRICTS_ZH_EN
    ]

    geocoded = len(features)
    statistics = {
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "reference_date": reference.isoformat(),
        "totals": {
            "records": len(dated),
            "boars": sum(r["boar_count"] for r in dated),
            "locations": len(locations),
            "districts_covered": len([d for d in district_list if d["district"]]),
            "mapped_records": geocoded,
        },
        "monthly": sorted(monthly.values(), key=lambda x: x["month"]),
        "by_district": district_list,
        "count_bands": count_bands,
        "locations": location_list,
    }

    meta = {
        "site_name": "豬絲馬跡",
        "site_name_en": "HK Wild Boar Traces",
        "data_source": {
            "name": "漁農自然護理署「野豬滋擾」網頁公佈之野豬捕捉行動紀錄",
            "name_en": (
                "Wild boar capture-action records published on the "
                "Agriculture, Fisheries and Conservation Department "
                "(AFCD) \"Wild Pig Nuisance\" webpage"
            ),
            "publisher": "香港特別行政區政府漁農自然護理署",
            "publisher_en": (
                "Agriculture, Fisheries and Conservation Department, "
                "The Government of the Hong Kong SAR"
            ),
            "url": AFCD_URL,
            "retrieved_at": datetime.now().strftime("%Y-%m-%d"),
            "processing": (
                "本網站資料整理自政府公開發佈的捕捉行動資訊，並以地圖及圖表形式呈現，"
                "方便公眾查閱。"
            ),
            "processing_en": (
                "The information on this website is compiled from publicly "
                "available government data and presented in a map-based "
                "visualisation for easier public reference."
            ),
        },
        "coverage": {
            "min_date": dates[0].isoformat(),
            "max_date": reference.isoformat(),
            "reference_date": reference.isoformat(),
            "note": (
                "本網站收錄官方網頁現時逐項公佈的行動紀錄；"
                "官方網頁僅逐項列出最近期的行動，更早的行動只有匯總數字。"
                "因此本網站並非完整的歷史資料庫，不同時段之間可能存在空檔。"
            ),
            "note_en": (
                "This website includes the itemised action records currently "
                "published on the official webpage; the official webpage only "
                "lists recent actions item by item, while earlier actions are "
                "published as totals only. The website is therefore not a "
                "complete historical database and there may be gaps between "
                "periods."
            ),
        },
        "historical_context": historical,
        "totals": statistics["totals"],
        "activity_levels": ACTIVITY_LEVELS,
        "limitations": [
            "資料來源為漁護署公佈的「野豬捕捉行動」紀錄，並非市民目擊報告，"
            "亦非全港野豬數量普查。",
            "官方網頁只逐項公佈最近期的行動，較早行動僅有匯總數字，"
            "故本網站的時間序列不連續。",
            "地點位置由地點名稱推算，屬近似位置，不代表實際行動的精確地點。",
            "活動指標只反映「紀錄時間新近度」，並非風險預測，"
            "亦不代表某地點現時是否危險。",
            "資料為靜態快照，更新頻率視乎資料整理進度，並非即時資料。",
        ],
        "limitations_en": [
            "The data are AFCD capture-action records, not public sighting "
            "reports, and not a territory-wide wild boar population survey.",
            "The official webpage itemises only recent actions; earlier "
            "actions are published as totals only, so the time series on "
            "this website is not continuous.",
            "Locations are estimated from place names and are approximate; "
            "they do not represent the exact spot of each operation.",
            "The activity indicator only reflects how recent the records are. "
            "It is not a risk forecast and does not indicate whether a "
            "location is currently dangerous.",
            "The data are a static snapshot, refreshed periodically rather "
            "than in real time.",
        ],
    }

    districts_out = {"districts": districts_all}

    DATA_DIR.mkdir(exist_ok=True)
    with open(DATA_DIR / "sightings.geojson", "w", encoding="utf-8") as fh:
        json.dump(geojson, fh, ensure_ascii=False, separators=(",", ":"))
    for name, payload in (
        ("statistics.json", statistics),
        ("meta.json", meta),
        ("districts.json", districts_out),
    ):
        with open(DATA_DIR / name, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=1)

    log(
        f"[OK] wrote data/sightings.geojson ({len(features)} mapped records), "
        f"statistics.json, meta.json, districts.json"
    )
    log(
        f"[OK] totals: {statistics['totals']['records']} records / "
        f"{statistics['totals']['boars']} boars / "
        f"{statistics['totals']['locations']} locations / "
        f"{statistics['totals']['districts_covered']} districts"
    )


# --------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--legacy-csv", type=Path, help="legacy mysql_coordinates.csv export to merge")
    parser.add_argument("--afcd-file", type=Path, help="locally saved AFCD page (offline fetch)")
    parser.add_argument("--offline", action="store_true", help="no network: cache only")
    args = parser.parse_args()

    records: list[dict] = []
    historical = None

    # 1. AFCD itemized records (live page or saved copy).
    if args.afcd_file:
        html = args.afcd_file.read_text(encoding="utf-8", errors="replace")
        log("[INFO] parsing local AFCD page copy")
    elif args.offline:
        html = ""
        log("[INFO] offline mode: skipping AFCD fetch")
    else:
        try:
            log("[INFO] fetching AFCD page ...")
            html = fetch_url(AFCD_URL).decode("utf-8", errors="replace")
        except Exception as exc:  # noqa: BLE001
            log(f"[WARN] AFCD fetch failed: {exc}")
            html = ""
    if html:
        afcd_records, historical = parse_afcd_page(html)
        log(f"[OK] AFCD page: {len(afcd_records)} itemized records")
        if historical:
            log(f"[OK] historical aggregate: {historical}")
        for r in afcd_records:
            records.append({**r, "lat": None, "lon": None, "district": None})

    # 2. Legacy CSV export (already geocoded).
    if args.legacy_csv:
        legacy = parse_legacy_csv(args.legacy_csv)
        log(f"[OK] legacy CSV: {len(legacy)} records")
        records.extend(legacy)

    if not records:
        log("[ERROR] no records available; nothing to do")
        return 1

    # 3. De-duplicate on (date, location, count).
    seen: set[tuple] = set()
    unique_records = []
    for r in records:
        key = (r["action_date"], r["location_name"], r["boar_count"])
        if key in seen:
            continue
        seen.add(key)
        unique_records.append(r)
    log(f"[OK] {len(unique_records)} unique records after de-duplication")

    # 4. Geocode + district assignment.
    geocode_all(unique_records, offline=args.offline)

    # 5-6. Aggregate and write.
    build_outputs(unique_records, historical)
    return 0


if __name__ == "__main__":
    sys.exit(main())
