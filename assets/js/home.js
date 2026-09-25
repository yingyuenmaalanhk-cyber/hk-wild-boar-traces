/**
 * 豬絲馬跡 — home page
 * Fills the hero snapshot, stat tiles and the latest-records list from the
 * pre-computed static datasets.
 */

import { loadDatasets } from "./data.js";
import { esc, formatDate } from "./site.js";

function fill(el, value) {
  if (el) el.textContent = value;
}

function render(data) {
  const { meta, statistics, records } = data;

  fill(document.querySelector('[data-stat="records"]'), String(statistics.totals.records));
  fill(document.querySelector('[data-stat="boars"]'), String(statistics.totals.boars));
  fill(document.querySelector('[data-stat="locations"]'), String(statistics.totals.locations));
  fill(document.querySelector('[data-stat="districts"]'), String(statistics.totals.districts_covered));
  fill(document.querySelector('[data-stat="ref"]'), meta.coverage.reference_date);
  fill(document.querySelector('[data-stat="updated"]'), meta.data_source.retrieved_at);

  const latest = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  const levelColors = Object.fromEntries(
    meta.activity_levels.map((l) => [l.key, l.color])
  );
  const list = document.querySelector("[data-latest-records]");
  if (list) {
    list.innerHTML = latest
      .map((r) => {
        const days = Math.round(
          (new Date(meta.coverage.reference_date) - new Date(r.date)) / 86400000
        );
        const level =
          days <= 30 ? "high" : days <= 90 ? "medium" : days <= 180 ? "low" : "past";
        return `<li class="card record-item">
          <span class="dot" style="background:${levelColors[level]}" aria-hidden="true"></span>
          <span class="when">${formatDate(r.date)}</span>
          <span class="what">${esc(r.location)}<small> · ${esc(r.district || "未分區")}</small></span>
          <span class="count">${r.count} 頭</span>
        </li>`;
      })
      .join("");
  }
}

loadDatasets().then(render).catch((error) => {
  console.error(error);
  const list = document.querySelector("[data-latest-records]");
  if (list) list.innerHTML = '<li class="card record-item">資料載入失敗，請稍後重試。</li>';
});
