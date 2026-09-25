/**
 * 豬絲馬跡 — dataset loading and filtering
 * Loads the static datasets and exposes pure helpers used by the map,
 * analytics and home pages. All data is read-only; nothing here writes back.
 */

import { loadJSON, daysSince } from "./i18n.js";

let cachePromise = null;

/** Load all datasets once; later calls share the same promise. */
export function loadDatasets() {
  if (!cachePromise) {
    cachePromise = Promise.all([
      loadJSON("data/meta.json"),
      loadJSON("data/statistics.json"),
      loadJSON("data/sightings.geojson"),
      loadJSON("data/districts.json"),
    ]).then(([meta, statistics, geojson, districts]) => ({
      meta,
      statistics,
      districts,
      records: geojson.features.map((f) => ({
        ...f.properties,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      })),
    }));
  }
  return cachePromise;
}

/**
 * Activity level for a record, derived from how recent it is relative to the
 * dataset reference date. Mirrors the thresholds used in the data pipeline
 * (30 / 90 / 180 days) and the colour scheme of the original QGIS viewer.
 */
export function levelOf(record, meta) {
  const days = daysSince(record.date, meta.coverage.reference_date);
  for (const level of meta.activity_levels) {
    if (level.max_days === null || days <= level.max_days) return level;
  }
  return meta.activity_levels[meta.activity_levels.length - 1];
}

/**
 * Apply the shared filter model to a list of record properties.
 * Filter fields (all optional):
 *   from, to        ISO date strings
 *   district        district zh name or ""
 *   level           activity level key or ""
 *   minCount        number
 *   q               free-text location substring
 */
export function applyFilters(records, filters, meta) {
  const { from, to, district, level, minCount, q } = filters;
  const query = (q || "").trim();
  const isUnzoned = district === "__unzoned__";
  return records.filter((r) => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (isUnzoned) {
      if (r.district) return false;
    } else if (district && r.district !== district) {
      return false;
    }
    if (minCount && r.count < minCount) return false;
    if (level && levelOf(r, meta).key !== level) return false;
    if (query && !(r.location || "").includes(query)) return false;
    return true;
  });
}

/** Summarise a filtered record list for the result counter. */
export function summarise(records) {
  return {
    records: records.length,
    boars: records.reduce((sum, r) => sum + (r.count || 0), 0),
    locations: new Set(records.map((r) => r.location)).size,
  };
}

/** Read filter values from the URL query string (cross-page deep links). */
export function filtersFromURL() {
  const params = new URLSearchParams(location.search);
  return {
    from: params.get("from") || "",
    to: params.get("to") || "",
    district: params.get("district") || "",
    level: params.get("level") || "",
    minCount: params.get("min_count") || "",
    q: params.get("q") || "",
  };
}

/** Reflect current filters into the URL without reloading the page. */
export function filtersToURL(filters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.district) params.set("district", filters.district);
  if (filters.level) params.set("level", filters.level);
  if (filters.minCount) params.set("min_count", filters.minCount);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}
