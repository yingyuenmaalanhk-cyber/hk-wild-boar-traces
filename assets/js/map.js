import "./site.js";

/**
 * 豬絲馬跡 — activity map page
 * Leaflet map with clustered action records, a location activity overlay and
 * an optional heatmap. Filters are view-only: they never modify the datasets.
 * Fully bilingual: switching language re-renders labels, popups and lists
 * while preserving the current map view and filters.
 */

import {
  loadDatasets,
  applyFilters,
  summarise,
  filtersFromURL,
  filtersToURL,
} from "./data.js";
import {
  currentLang,
  daysSince,
  districtName,
  esc,
  formatDate,
  metaField,
  t,
} from "./i18n.js";

const HK_CENTER = [22.35, 114.15];
const RESULT_LIST_CAP = 200;

let meta;
let records;          // all record properties
let map;
let cluster;          // L.markerClusterGroup
let heat = null;      // L.heatLayer
let activityLayer;    // L.layerGroup
let layerControl = null;
let markersById = new Map();
let current = [];
let filters = {};

const els = {
  form: null, q: null, district: null, level: null, from: null, to: null,
  minCount: null, source: null, reset: null, count: null, list: null, legend: null,
};

/* ------------------------------------------------------------------ map -- */

function baseLayer() {
  return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  });
}

/** Activity level metadata for a record (recency-based). */
function levelOf(record) {
  const days = daysSince(record.date, meta.coverage.reference_date);
  for (const level of meta.activity_levels) {
    if (level.max_days === null || days <= level.max_days) return level;
  }
  return meta.activity_levels[meta.activity_levels.length - 1];
}

function popupHTML(record) {
  const days = daysSince(record.date, meta.coverage.reference_date);
  const when = days === 0
    ? t("popup.when.today")
    : t("popup.when.days", { days });
  const level = levelOf(record);
  const isCommunity = record.source === "community";
  const countValue = record.count_band && isCommunity
    ? t("popup.count.withband", { value: t("popup.count.value", { n: record.count }), band: record.count_band })
    : t("popup.count.value", { n: record.count });
  const sourceLine = isCommunity ? t("popup.source.community") : t("popup.source");
  const precision = record.location_precision === "district_centre"
    ? ` ${t("popup.location_centre")}`
    : "";
  return `<div class="popup">
    <div class="popup-date">${formatDate(record.date)}${when ? ` · ${when}` : ""}</div>
    <h3>${esc(record.location)}</h3>
    <dl>
      <dt>${t("popup.count")}</dt><dd>${countValue}</dd>
      <dt>${t("popup.district")}</dt><dd>${esc(districtName(record.district, record.district_en))}</dd>
      ${record.action_number ? `<dt>${t("popup.actionno")}</dt><dd>#${esc(record.action_number)}</dd>` : ""}
      ${record.notes ? `<dt>${t("popup.notes")}</dt><dd>${esc(record.notes)}</dd>` : ""}
      <dt>${t("popup.level")}</dt><dd>${esc(metaField(level, "label"))}</dd>
    </dl>
    <p class="popup-src">${sourceLine}${precision}</p>
  </div>`;
}

function markerStyle(record) {
  const level = levelOf(record);
  const isCommunity = record.source === "community";
  return {
    radius: 5 + Math.sqrt(Math.max(record.count, 1)) * 1.6,
    color: isCommunity ? "#8e5ea8" : "#ffffff",
    weight: isCommunity ? 2.5 : 1.5,
    fillColor: level.color,
    fillOpacity: 0.92,
  };
}

function buildMarkers() {
  cluster.clearLayers();
  markersById.clear();
  for (const record of current) {
    if (record.lat == null) continue;
    const marker = L.circleMarker([record.lat, record.lon], markerStyle(record));
    marker.bindPopup(popupHTML(record), { maxWidth: 280 });
    cluster.addLayer(marker);
    markersById.set(record, marker);
  }
}

function buildHeat() {
  const points = current
    .filter((r) => r.lat != null)
    .map((r) => [r.lat, r.lon, Math.min(r.count, 8)]);
  if (heat) heat.setLatLngs(points);
}

function buildActivity() {
  activityLayer.clearLayers();
  const byLocation = new Map();
  for (const r of current) {
    if (r.lat == null) continue;
    const list = byLocation.get(r.location) || [];
    list.push(r);
    byLocation.set(r.location, list);
  }
  for (const [name, list] of byLocation) {
    const last = list.reduce((a, b) => (a.date > b.date ? a : b));
    const level = levelOf(last);
    const boars = list.reduce((s, r) => s + r.count, 0);
    const circle = L.circle([last.lat, last.lon], {
      // Non-interactive: the circles stay purely visual so they never block
      // clicks on the record markers beneath them. The location summary they
      // used to show is available in the analytics location table.
      interactive: false,
      radius: 140 + Math.min(list.length, 8) * 45,
      color: level.color,
      weight: 1.5,
      fillColor: level.color,
      fillOpacity: 0.22,
    });
    activityLayer.addLayer(circle);
  }
}

/* -------------------------------------------------------------- results -- */

function renderCount() {
  const s = summarise(current);
  els.count.textContent = t("map.summary", {
    records: s.records,
    boars: s.boars,
    locations: s.locations,
  });
}

function renderList() {
  const sorted = [...current].sort((a, b) => b.date.localeCompare(a.date));
  const shown = sorted.slice(0, RESULT_LIST_CAP);
  const colors = Object.fromEntries(meta.activity_levels.map((l) => [l.key, l.color]));
  els.list.innerHTML = shown
    .map((r) => {
      const level = levelOf(r);
      const communityTag = r.source === "community"
        ? ` <span class="tag-community">${t("home.tag.community")}</span>`
        : "";
      return `<li>
        <button type="button" class="result-item" data-index="${sorted.indexOf(r)}">
          <span class="dot" style="background:${colors[level.key]}" aria-hidden="true"></span>
          <span class="meta">
            <span class="loc">${esc(r.location)}${communityTag}</span>
            <span class="sub">${formatDate(r.date)} · ${esc(districtName(r.district, r.district_en))}</span>
          </span>
          <span class="badge badge-${level.key}">
            <span class="dot" style="background:${colors[level.key]}" aria-hidden="true"></span>
            ${r.count} · ${esc(metaField(level, "label"))}
          </span>
        </button>
      </li>`;
    })
    .join("");
  if (sorted.length > RESULT_LIST_CAP) {
    const li = document.createElement("li");
    li.style.cssText = "font-size:.8rem;color:var(--c-ink-faint);padding:8px 4px;";
    li.textContent = t("map.list.cap", { cap: RESULT_LIST_CAP, total: sorted.length });
    els.list.appendChild(li);
  }
}

function focusRecord(record) {
  const marker = markersById.get(record);
  if (!marker) return;
  cluster.zoomToShowLayer(marker, () => {
    map.setView([record.lat, record.lon], Math.max(map.getZoom(), 15), { animate: true });
    marker.openPopup();
  });
}

/* -------------------------------------------------------------- filters -- */

function readFiltersFromForm() {
  filters = {
    q: els.q.value,
    district: els.district.value,
    level: els.level.value,
    from: els.from.value,
    to: els.to.value,
    minCount: els.minCount.value,
    source: els.source.value,
  };
}

function writeFiltersToForm() {
  els.q.value = filters.q || "";
  els.district.value = filters.district || "";
  els.level.value = filters.level || "";
  els.from.value = filters.from || "";
  els.to.value = filters.to || "";
  els.minCount.value = filters.minCount || "";
  els.source.value = filters.source || "";
}

function render() {
  current = applyFilters(records, filters, meta);
  buildMarkers();
  buildHeat();
  buildActivity();
  renderCount();
  renderList();
  filtersToURL(filters);
}

let debounceTimer = 0;
function onFilterInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    readFiltersFromForm();
    render();
  }, 180);
}

/* ----------------------------------------------------------------- init -- */

function buildLegend() {
  els.legend.innerHTML = meta.activity_levels
    .map(
      (l) => `<li><span class="swatch" style="background:${l.color}"></span>${esc(metaField(l, "label"))} · ${esc(metaField(l, "description"))}</li>`
    )
    .join("");
  const community = document.createElement("li");
  community.innerHTML = `<span class="swatch swatch-community" aria-hidden="true"></span>${t("map.legend.community")}`;
  els.legend.appendChild(community);
}

function populateDistricts(districts) {
  const previous = els.district.value;
  // Remove everything except the "all districts" option, then rebuild.
  for (const option of [...els.district.options]) {
    if (option.value !== "") option.remove();
  }
  for (const d of districts.districts) {
    const name = currentLang() === "en" ? d.en : d.zh;
    const label = d.records > 0
      ? `${name}${t("map2.districtcount", { n: d.records })}`
      : `${name}${t("map.district.none")}`;
    const el = document.createElement("option");
    el.value = d.zh;
    el.textContent = label;
    els.district.appendChild(el);
  }
  els.district.value = previous;
}

function buildLayerControl() {
  if (layerControl) map.removeControl(layerControl);
  layerControl = L.control.layers(
    {},
    {
      [t("map.layer.records")]: cluster,
      [t("map.layer.activity")]: activityLayer,
      [t("map.layer.heat")]: heat,
    },
    { collapsed: window.innerWidth < 720 }
  );
  layerControl.addTo(map);
}

function initMap() {
  map = L.map("map", {
    center: HK_CENTER,
    zoom: 10,
    minZoom: 9,
    maxZoom: 18,
    maxBounds: L.latLngBounds([22.05, 113.6], [22.7, 114.7]),
    maxBoundsViscosity: 0.8,
    zoomControl: true,
  });
  baseLayer().addTo(map);

  // Activity circles are non-interactive (see buildActivity), so they never
  // block clicks on the record markers beneath them.
  activityLayer = L.layerGroup();
  map.addLayer(activityLayer);

  cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 45,
    iconCreateFunction: (c) =>
      L.divIcon({
        html: `<span>${c.getChildCount()}</span>`,
        className: "cluster-badge",
        iconSize: L.point(36, 36),
      }),
  });
  map.addLayer(cluster);

  // Created up front (empty) so the layers control can bind it; unchecked
  // until the visitor enables it.
  heat = L.heatLayer([], {
    radius: 28,
    blur: 20,
    maxZoom: 12,
    minOpacity: 0.35,
    gradient: { 0.2: "#f6d55c", 0.5: "#ed9a45", 0.8: "#d64541" },
  });

  buildLayerControl();

  window.addEventListener("resize", () => {
    map.invalidateSize();
  });
}

async function init() {
  els.form = document.getElementById("filter-form");
  els.q = document.getElementById("f-q");
  els.district = document.getElementById("f-district");
  els.level = document.getElementById("f-level");
  els.from = document.getElementById("f-from");
  els.to = document.getElementById("f-to");
  els.minCount = document.getElementById("f-min-count");
  els.source = document.getElementById("f-source");
  els.reset = document.getElementById("btn-reset");
  els.count = document.querySelector("[data-results-count]");
  els.list = document.querySelector("[data-result-list]");
  els.legend = document.querySelector("[data-legend]");

  const data = await loadDatasets();
  meta = data.meta;
  records = data.records.filter((r) => r.lat != null);

  buildLegend();
  populateDistricts(data.districts);
  initMap();

  const bounds = { min: meta.coverage.min_date, max: meta.coverage.max_date };
  els.from.min = bounds.min; els.from.max = bounds.max;
  els.to.min = bounds.min; els.to.max = bounds.max;

  filters = filtersFromURL();
  writeFiltersToForm();
  render();

  els.form.addEventListener("input", onFilterInput);
  els.form.addEventListener("change", onFilterInput);
  els.form.addEventListener("submit", (e) => e.preventDefault());
  els.reset.addEventListener("click", () => {
    filters = { q: "", district: "", level: "", from: "", to: "", minCount: "", source: "" };
    writeFiltersToForm();
    render();
  });

  els.list.addEventListener("click", (event) => {
    const button = event.target.closest(".result-item");
    if (!button) return;
    const record = current[Number(button.dataset.index)];
    if (record) focusRecord(record);
  });

  // Language switch: keep the view, filters and map state; re-render text.
  document.addEventListener("langchange", () => {
    buildLegend();
    populateDistricts(data.districts);
    buildLayerControl();
    render();
  });
}

init().catch((error) => {
  console.error(error);
  const counter = document.querySelector("[data-results-count]");
  if (counter) counter.textContent = t("map.loadfail");
});
