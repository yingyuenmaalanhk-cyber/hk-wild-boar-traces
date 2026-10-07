import "./site.js";

/**
 * 豬絲馬跡 — home page
 * Fills the hero snapshot and the latest-records list from the static
 * datasets. Re-renders when the visitor switches language.
 */

import { loadDatasets } from "./data.js";
import { currentLang, daysSince, esc, formatDate, levelOfKey, t } from "./i18n.js";

function fill(el, value) {
  if (el) el.textContent = value;
}

function render(data) {
  const { meta, statistics, records } = data;

  fill(document.querySelector('[data-stat="records"]'), String(statistics.totals.records));
  fill(document.querySelector('[data-stat="boars"]'), String(statistics.totals.boars));
  fill(document.querySelector('[data-stat="locations"]'), String(statistics.totals.locations));
  fill(document.querySelector('[data-stat="districts"]'), String(statistics.totals.districts_covered));
  fill(
    document.querySelector("[data-asof]"),
    t("home.snap.asof", {
      date: meta.coverage.reference_date,
      updated: meta.data_source.retrieved_at,
    })
  );

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
        const levelKey = levelOfKey(r.date, meta.coverage.reference_date);
        const district = currentLang() === "en"
          ? (r.district_en || r.district || t("analytics.unzoned"))
          : (r.district || t("analytics.unzoned"));
        return `<li class="card record-item">
          <span class="dot" style="background:${levelColors[levelKey]}" aria-hidden="true"></span>
          <span class="when">${formatDate(r.date)}</span>
          <span class="what">${esc(r.location)}<small> · ${esc(district)}</small>${r.source === "community" ? ` <span class="tag-community">${t("home.tag.community")}</span>` : ""}</span>
          <span class="count">${t("home.count.unit", { n: r.count })}</span>
        </li>`;
      })
      .join("");
  }
}

loadDatasets()
  .then((data) => {
    render(data);
    document.addEventListener("langchange", () => render(data));
  })
  .catch((error) => {
    console.error(error);
    const list = document.querySelector("[data-latest-records]");
    if (list) list.innerHTML = `<li class="card record-item">${esc(t("home.loadfail"))}</li>`;
  });

void daysSince;
