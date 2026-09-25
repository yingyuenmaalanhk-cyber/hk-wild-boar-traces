/**
 * 豬絲馬跡 — activity map page
 * Leaflet map with clustered action records, a location activity overlay and
 * an optional heatmap. Filters are view-only: they never modify the datasets.
 */

import {
  loadDatasets,
  applyFilters,
  summarise,
  filtersFromURL,
  filtersToURL,
  levelOf,
} from "./data.js";
import { esc, formatDate, daysSince } from "./site.js";

const HK_CENTER = [22.35, 114.15];
const RESULT_LIST_CAP = 200;

let meta;
let records;          // all record properties
let statistics;
let map;
let cluster;          // L.markerClusterGroup
let heat = null;      // L.heatLayer or null
let activityLayer;    // L.layerGroup
let markersById = new Map();
let current = [];
let filters = {};

const els = {
  form: null, q: null, district: null, level: null, from: null, to: null,
  minCount: null, reset: null, count: null, list: null, legend: null,
};

/* ------------------------------------------------------------------ map -- */

function baseLayers() {
  // Single first-party-friendly basemap: OpenStreetMap standard raster tiles.
  // (CARTO's light tiles now require an API key, so they are not used.)
  const standard = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  });
  return { standard };
}

function popupHTML(record, level) {
  const days = daysSince(record.date, meta.coverage.reference_date);
  const when =
    days === 0 ? "資料截止日當天" : days > 0 ? `${days} 天前` : "";
  return `<div class="popup">
    <div class="popup-date">${formatDate(record.date)}${when ? ` · ${when}` : ""}</div>
    <h3>${esc(record.location)}</h3>
    <dl>
      <dt>野豬數目</dt><dd>${record.count} 頭</dd>
      <dt>所屬地區</dt><dd>${esc(record.district || "未分區")}</dd>
      ${record.action_number ? `<dt>行動編號</dt><dd>#${esc(record.action_number)}</dd>` : ""}
      <dt>最近程度</dt><dd>${esc(level.label)}</dd>
    </dl>
    <p class="popup-src">資料來源：漁護署公佈之捕捉行動 · 位置為近似地點</p>
  </div>`;
}

function markerStyle(record) {
  const level = levelOf(record, meta);
  return {
    radius: 5 + Math.sqrt(Math.max(record.count, 1)) * 1.6,
    color: "#ffffff",
    weight: 1.5,
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
    const level = levelOf(record, meta);
    marker.bindPopup(popupHTML(record, level), { maxWidth: 280 });
    cluster.addLayer(marker);
    markersById.set(record, marker);
  }
}

function buildHeat() {
  const points = current
    .filter((r) => r.lat != null)
    .map((r) => [r.lat, r.lon, Math.min(r.count, 8)]);
  if (heat) {
    heat.setLatLngs(points);
  }
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
    const days = daysSince(last.date, meta.coverage.reference_date);
    const level = levelOf(last, meta);
    const boars = list.reduce((s, r) => s + r.count, 0);
    const circle = L.circle([last.lat, last.lon], {
      radius: 140 + Math.min(list.length, 8) * 45,
      color: level.color,
      weight: 1.5,
      fillColor: level.color,
      fillOpacity: 0.22,
    });
    circle.bindPopup(
      `<div class="popup">
        <div class="popup-date">活動指標 · 地點汇总</div>
        <h3>${esc(name)}</h3>
        <dl>
          <dt>目前程度</dt><dd>${esc(level.label)}</dd>
          <dt>紀錄次數</dt><dd>${list.length} 次</dd>
          <dt>野豬數目</dt><dd>${boars} 頭</dd>
          <dt>最近行動</dt><dd>${formatDate(last.date)}</dd>
        </dl>
        <p class="popup-src">程度按最近一次行動時間劃分（${esc(level.description)}），並非風險預測。</p>
      </div>`,
      { maxWidth: 280 }
    );
    activityLayer.addLayer(circle);
  }
}

/* -------------------------------------------------------------- results -- */

function renderCount() {
  const s = summarise(current);
  els.count.innerHTML =
    `符合 <strong>${s.records}</strong> 筆紀錄 · ` +
    `共 <strong>${s.boars}</strong> 頭野豬 · ` +
    `<strong>${s.locations}</strong> 個地點`;
}

function renderList() {
  const sorted = [...current].sort((a, b) => b.date.localeCompare(a.date));
  const shown = sorted.slice(0, RESULT_LIST_CAP);
  const colors = Object.fromEntries(meta.activity_levels.map((l) => [l.key, l.color]));
  els.list.innerHTML = shown
    .map((r, index) => {
      const level = levelOf(r, meta);
      return `<li>
        <button type="button" class="result-item" data-index="${sorted.indexOf(r)}">
          <span class="dot" style="background:${colors[level.key]}" aria-hidden="true"></span>
          <span class="meta">
            <span class="loc">${esc(r.location)}</span>
            <span class="sub">${formatDate(r.date)} · ${esc(r.district || "未分區")}</span>
          </span>
          <span class="badge badge-${level.key}">${r.count} 頭</span>
        </button>
      </li>`;
    })
    .join("");
  if (sorted.length > RESULT_LIST_CAP) {
    const li = document.createElement("li");
    li.style.cssText = "font-size:.8rem;color:var(--c-ink-faint);padding:8px 4px;";
    li.textContent = `僅顯示最近 ${RESULT_LIST_CAP} 筆，合共 ${sorted.length} 筆，請善用篩選收窄範圍。`;
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
  };
}

function writeFiltersToForm() {
  els.q.value = filters.q || "";
  els.district.value = filters.district || "";
  els.level.value = filters.level || "";
  els.from.value = filters.from || "";
  els.to.value = filters.to || "";
  els.minCount.value = filters.minCount || "";
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
      (l) => `<li><span class="swatch" style="background:${l.color}"></span>${esc(l.label)} · ${esc(l.description)}</li>`
    )
    .join("");
}

function initMap() {
  const { standard } = baseLayers();
  map = L.map("map", {
    center: HK_CENTER,
    zoom: 10,
    minZoom: 9,
    maxZoom: 18,
    maxBounds: L.latLngBounds([22.05, 113.6], [22.7, 114.7]),
    maxBoundsViscosity: 0.8,
    zoomControl: true,
  });
  standard.addTo(map);

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

  activityLayer = L.layerGroup();

  // Heat layer is created up front (empty) so the layers control can bind it;
  // it stays unchecked until the visitor enables it.
  heat = L.heatLayer([], {
    radius: 28,
    blur: 20,
    maxZoom: 12,
    minOpacity: 0.35,
    gradient: { 0.2: "#f6d55c", 0.5: "#ed9a45", 0.8: "#d64541" },
  });

  L.control
    .layers(
      {},
      { 行動紀錄: cluster, 活動指標範圍: activityLayer, 熱力圖: heat },
      { collapsed: window.innerWidth < 720 }
    )
    .addTo(map);

  map.addLayer(activityLayer);

  window.addEventListener("resize", () => {
    map.invalidateSize();
  });
}

function populateDistricts(districts) {
  for (const d of districts.districts) {
    const label = d.records > 0 ? `${d.zh}（${d.records}）` : `${d.zh}（無紀錄）`;
    const option = document.createElement("option");
    option.value = d.zh;
    option.textContent = label;
    els.district.appendChild(option);
  }
}

async function init() {
  els.form = document.getElementById("filter-form");
  els.q = document.getElementById("f-q");
  els.district = document.getElementById("f-district");
  els.level = document.getElementById("f-level");
  els.from = document.getElementById("f-from");
  els.to = document.getElementById("f-to");
  els.minCount = document.getElementById("f-min-count");
  els.reset = document.getElementById("btn-reset");
  els.count = document.querySelector("[data-results-count]");
  els.list = document.querySelector("[data-result-list]");
  els.legend = document.querySelector("[data-legend]");

  const data = await loadDatasets();
  meta = data.meta;
  records = data.records.filter((r) => r.lat != null);
  statistics = data.statistics;

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
    filters = { q: "", district: "", level: "", from: "", to: "", minCount: "" };
    writeFiltersToForm();
    render();
  });

  els.list.addEventListener("click", (event) => {
    const button = event.target.closest(".result-item");
    if (!button) return;
    const record = current[Number(button.dataset.index)];
    if (record) focusRecord(record);
  });
}

init().catch((error) => {
  console.error(error);
  const counter = document.querySelector("[data-results-count]");
  if (counter) counter.textContent = "資料載入失敗，請重新整理頁面。";
});
