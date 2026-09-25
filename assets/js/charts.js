/**
 * 豬絲馬跡 — analytics page
 * All charts are recomputed from the filtered record list, so the numbers
 * always agree with the map page for the same filters.
 */

import { loadDatasets, applyFilters, filtersFromURL, levelOf } from "./data.js";
import { esc, formatDate, daysSince } from "./site.js";

const els = {
  form: null, from: null, to: null, district: null, reset: null, mapLink: null,
};
const charts = {};

function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return `${y}/${m}`;
}

function aggregate(records) {
  const monthly = new Map();
  const byDistrict = new Map();
  const byLocation = new Map();
  const bands = [
    { label: "1 頭", lo: 1, hi: 1 },
    { label: "2–3 頭", lo: 2, hi: 3 },
    { label: "4–6 頭", lo: 4, hi: 6 },
    { label: "7 頭或以上", lo: 7, hi: 999 },
  ].map((b) => ({ ...b, records: 0, boars: 0 }));

  for (const r of records) {
    const m = monthly.get(r.month) || { records: 0, boars: 0 };
    m.records += 1; m.boars += r.count;
    monthly.set(r.month, m);

    const key = r.district || "未分區";
    const d = byDistrict.get(key) || { records: 0, boars: 0, locations: new Set() };
    d.records += 1; d.boars += r.count; d.locations.add(r.location);
    byDistrict.set(key, d);

    const loc = byLocation.get(r.location) || { records: 0, boars: 0, last: "" };
    loc.records += 1; loc.boars += r.count;
    loc.last = loc.last > r.date ? loc.last : r.date;
    byLocation.set(r.location, loc);

    const band = bands.find((b) => r.count >= b.lo && r.count <= b.hi);
    if (band) { band.records += 1; band.boars += r.count; }
  }

  return {
    monthly: [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    byDistrict: [...byDistrict.entries()].sort((a, b) => b[1].boars - a[1].boars),
    byLocation: [...byLocation.entries()].sort((a, b) => b[1].records - a[1].records),
    bands,
  };
}

/* ---------------------------------------------------------------- charts -- */

function destroyCharts() {
  for (const key of Object.keys(charts)) {
    charts[key]?.destroy();
    delete charts[key];
  }
}

function renderCharts(records, levelColors) {
  const agg = aggregate(records);
  destroyCharts();

  Chart.defaults.font.family =
    '"PingFang HK", "Microsoft JhengHei", "Noto Sans TC", system-ui, sans-serif';
  Chart.defaults.color = "#49584f";

  charts.monthly = new Chart(document.getElementById("chart-monthly"), {
    type: "bar",
    data: {
      labels: agg.monthly.map(([m]) => monthLabel(m)),
      datasets: [
        {
          type: "bar", label: "行動次數",
          data: agg.monthly.map(([, v]) => v.records),
          backgroundColor: "rgba(46, 107, 78, 0.75)", borderRadius: 5, yAxisID: "y",
        },
        {
          type: "line", label: "野豬數目",
          data: agg.monthly.map(([, v]) => v.boars),
          borderColor: "#b97a1a", backgroundColor: "#b97a1a",
          tension: 0.25, pointRadius: 4, yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "行動次數" }, grid: { color: "#eef0ea" } },
        y1: { beginAtZero: true, position: "right", title: { display: true, text: "野豬數目" }, grid: { drawOnChartArea: false } },
      },
    },
  });

  charts.district = new Chart(document.getElementById("chart-district"), {
    type: "bar",
    data: {
      labels: agg.byDistrict.map(([d]) => d),
      datasets: [
        { label: "行動次數", data: agg.byDistrict.map(([, v]) => v.records), backgroundColor: "rgba(46, 107, 78, 0.75)", borderRadius: 4 },
        { label: "野豬數目", data: agg.byDistrict.map(([, v]) => v.boars), backgroundColor: "rgba(185, 122, 26, 0.7)", borderRadius: 4 },
      ],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      scales: { x: { beginAtZero: true, grid: { color: "#eef0ea" } } },
    },
  });

  charts.bands = new Chart(document.getElementById("chart-bands"), {
    type: "doughnut",
    data: {
      labels: agg.bands.map((b) => b.label),
      datasets: [{
        data: agg.bands.map((b) => b.records),
        backgroundColor: ["#2e6b4e", "#5e9678", "#b97a1a", "#c0392b"],
        borderWidth: 2, borderColor: "#fff",
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
  });

  const top = agg.byLocation.slice(0, 10);
  charts.top = new Chart(document.getElementById("chart-top-locations"), {
    type: "bar",
    data: {
      labels: top.map(([name]) => name),
      datasets: [{ label: "行動次數", data: top.map(([, v]) => v.records), backgroundColor: "rgba(46, 107, 78, 0.75)", borderRadius: 4 }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef0ea" } } },
    },
  });

  void levelColors;
}

/* ---------------------------------------------------------------- tables -- */

function renderDistrictTable(records, meta) {
  const agg = aggregate(records);
  const totalBoars = agg.byDistrict.reduce((s, [, v]) => s + v.boars, 0) || 1;
  const tbody = document.querySelector("[data-district-table] tbody");
  tbody.innerHTML = agg.byDistrict
    .map(([district, v]) => {
      const pct = Math.round((v.boars / totalBoars) * 1000) / 10;
      const params = new URLSearchParams();
      if (district !== "未分區") params.set("district", district);
      const from = els.from.value; const to = els.to.value;
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return `<tr>
        <td>${esc(district)}</td>
        <td class="num">${v.records}</td>
        <td class="num">${v.boars}</td>
        <td class="num">${v.locations.size}</td>
        <td><span class="bar-cell"><span class="bar" style="width:${Math.min(pct * 2, 100)}px"></span>${pct}%</span></td>
        <td><a href="map.html${params.toString() ? "?" + params.toString() : ""}">查看</a></td>
      </tr>`;
    })
    .join("");
  void meta;
}

function renderLocationTable(records, meta) {
  const agg = aggregate(records);
  const top = agg.byLocation.slice(0, 15);
  const tbody = document.querySelector("[data-location-table] tbody");
  const colors = Object.fromEntries(meta.activity_levels.map((l) => [l.key, l.color]));
  const labels = Object.fromEntries(meta.activity_levels.map((l) => [l.key, l.label]));
  tbody.innerHTML = top
    .map(([name, v]) => {
      const days = daysSince(v.last, meta.coverage.reference_date);
      const level = levelOf({ date: v.last }, meta);
      return `<tr>
        <td>${esc(name)}</td>
        <td>${esc(records.find((r) => r.location === name)?.district || "—")}</td>
        <td class="num">${v.records}</td>
        <td class="num">${v.boars}</td>
        <td class="num">${formatDate(v.last)}</td>
        <td><span class="badge badge-${level.key}"><span class="dot" style="background:${colors[level.key]}"></span>${labels[level.key]}</span></td>
      </tr>`;
    })
    .join("");
}

function renderSummary(records) {
  const boars = records.reduce((s, r) => s + r.count, 0);
  const set = (key, value) => {
    const el = document.querySelector(`[data-sum="${key}"]`);
    if (el) el.textContent = value;
  };
  set("records", String(records.length));
  set("boars", String(boars));
  set("locations", String(new Set(records.map((r) => r.location)).size));
  set("avg", records.length ? (boars / records.length).toFixed(1) : "0");
}

/* ----------------------------------------------------------------- init -- */

function readFilters() {
  return {
    from: els.from.value, to: els.to.value, district: els.district.value,
    level: "", minCount: "", q: "",
  };
}

function renderAll(data) {
  const records = applyFilters(
    data.records.filter((r) => r.district !== undefined),
    readFilters(),
    data.meta
  );
  const levelColors = Object.fromEntries(data.meta.activity_levels.map((l) => [l.key, l.color]));
  renderSummary(records);
  renderCharts(records, levelColors);
  renderDistrictTable(records, data.meta);
  renderLocationTable(records, data.meta);

  const params = new URLSearchParams();
  if (els.from.value) params.set("from", els.from.value);
  if (els.to.value) params.set("to", els.to.value);
  if (els.district.value) params.set("district", els.district.value);
  els.mapLink.href = "map.html" + (params.toString() ? "?" + params.toString() : "");
}

async function init() {
  els.form = document.getElementById("filter-form");
  els.from = document.getElementById("a-from");
  els.to = document.getElementById("a-to");
  els.district = document.getElementById("a-district");
  els.reset = document.getElementById("a-reset");
  els.mapLink = document.getElementById("a-map-link");

  const data = await loadDatasets();
  const { meta } = data;

  for (const d of data.districts.districts) {
    if (d.records === 0) continue;
    const option = document.createElement("option");
    option.value = d.zh;
    option.textContent = `${d.zh}（${d.records}）`;
    els.district.appendChild(option);
  }
  els.from.min = meta.coverage.min_date; els.from.max = meta.coverage.max_date;
  els.to.min = meta.coverage.min_date; els.to.max = meta.coverage.max_date;

  const initial = filtersFromURL();
  if (initial.from) els.from.value = initial.from;
  if (initial.to) els.to.value = initial.to;
  if (initial.district) els.district.value = initial.district;

  renderAll(data);

  let timer = 0;
  const onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(() => renderAll(data), 150);
  };
  els.form.addEventListener("input", onChange);
  els.form.addEventListener("change", onChange);
  els.form.addEventListener("submit", (e) => e.preventDefault());
  els.reset.addEventListener("click", () => {
    els.from.value = ""; els.to.value = ""; els.district.value = "";
    renderAll(data);
  });
}

init().catch((error) => {
  console.error(error);
  document.querySelector(".filter-bar")?.insertAdjacentHTML(
    "afterend",
    '<p class="note warn" style="margin-top:12px;">資料載入失敗，請重新整理頁面。</p>'
  );
});
