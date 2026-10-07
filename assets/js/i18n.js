/**
 * 豬絲馬跡 — bilingual support (Traditional Chinese / English)
 *
 * - UI chrome and dynamic strings use the dictionary below via t().
 * - Long prose (about page) uses paired .lang-zh / .lang-en blocks toggled
 *   by the html[lang] attribute.
 * - The chosen language is persisted in localStorage; first visit follows
 *   the browser language preference.
 */

const STORAGE_KEY = "pigt-lang";

const DICT = {
  zh: {
    "doc.title.home": "豬絲馬跡 — 香港野豬活動資訊平台",
    "doc.title.map": "活動地圖 — 豬絲馬跡",
    "doc.title.analytics": "數據分析 — 豬絲馬跡",
    "doc.title.about": "關於計劃與資料說明 — 豬絲馬跡",
    "doc.title.report": "報告野豬出沒 — 豬絲馬跡",
    "doc.title.404": "找不到頁面 — 豬絲馬跡",

    "a11y.skip": "跳至主要內容",
    "a11y.nav": "主導覽",
    "a11y.menu": "開啟或關閉主選單",
    "a11y.lang.group": "語言 Language",
    "a11y.lang.zh": "切換至繁體中文",
    "a11y.lang.en": "Switch to English",

    "lang.zh": "中文",
    "lang.en": "EN",

    "nav.home": "主頁",
    "nav.map": "活動地圖",
    "nav.analytics": "數據分析",
    "nav.report": "報告出沒",
    "nav.about": "關於計劃",

    "banner.snapshot": "資料快照",
    "banner.source": "來源",
    "banner.source_name": "漁農自然護理署",
    "banner.nonrealtime": "非即時統計",
    "banner.learn": "了解資料限制",

    "foot.tagline":
      "公開、唯讀的香港野豬活動資訊平台。資料整理自政府公開資料，僅供參考，不構成任何風險建議。",
    "foot.browse": "瀏覽",
    "foot.data": "資料",
    "foot.legal": "法律與私隱",
    "foot.afcd": "漁護署「野豬滋擾」公佈",
    "foot.data_notes": "資料說明與限制",
    "foot.privacy": "私隱聲明",
    "foot.copyright": "版權及所有權",
    "foot.copyright_line": "© 2026 馬英源及項目團隊。保留所有權利。",
    "foot.ownership":
      "本網站之原創設計、程式碼及項目內容，除另有標明外，均由馬英源及項目團隊擁有。第三方資料、地圖、商標及外部資源之權利歸其各自權利人所有。",
    "foot.readonly":
      "資料來源：漁護署公佈之野豬捕捉行動資料，以及公眾經表單提交之目擊報告 · 本網站資料不可編輯，歡迎透過「報告出沒」頁提交目擊情報。",

    "home.cta.report": "報告野豬出沒",
    "home.tag.community": "公眾",

    "report.eyebrow": "公眾報告",
    "report.title": "報告野豬出沒",
    "report.lead":
      "留意到野豬出沒？填寫下方表單提交目擊報告，幫助完善本平台的社區資料。提交前請細閱以下提示。",
    "report.form.title": "填寫報告表單",
    "report.form.loading": "正在載入表單…",
    "report.form.unavailable":
      "報告表單即將開放，請稍後再訪。",
    "report.form.open": "在新視窗開啟表單 →",
    "report.how.title": "報告會如何處理",
    "report.how.body":
      "提交的報告會自動存入本平台的資料表，並於下次資料更新（現時每月一次）自動顯示於地圖，標示為「公眾報告（未經官方核實）」。你可以用地圖的「資料來源」篩選單獨查看公眾報告。",
    "report.safety.title": "提交前請注意",
    "report.safety.body":
      "請勿填寫任何個人資料（姓名、電話、地址等）；位置寫大約即可；報告內容將公開顯示，提交即表示同意公開（明顯的電話號碼及電郵會被自動遮蔽）。緊急情況請立即報警（999）或致電政府熱線 1823，切勿使用本表單。",
    "report.privacy.title": "私隱",
    "report.privacy.body":
      "表單由 Google Forms 提供，提交的內容會按 Google 的服務條款處理；本站只會發佈你填寫的報告內容，不會公開你的身份。",

    "home.hero.tagline": "香港野豬活動資訊平台 · 公開 · 唯讀",
    "home.hero.lead":
      "整理香港特區政府漁農自然護理署公佈的野豬捕捉行動紀錄，讓公眾透過地圖與圖表，了解野豬活動的分佈、趨勢與最近動態。毋須登入，開放瀏覽。",
    "home.cta.map": "開啟活動地圖",
    "home.cta.analytics": "查看數據分析",
    "home.snap.title": "資料概覽",
    "home.snap.records": "行動紀錄",
    "home.snap.boars": "涉及野豬",
    "home.snap.locations": "地點",
    "home.snap.districts": "涵蓋地區",
    "home.snap.asof": "資料截至 {date} · 更新於 {updated}",
    "home.f1.title": "地圖探索",
    "home.f1.body":
      "以互動地圖瀏覽每宗行動紀錄的位置與規模，支援標記聚合、熱力圖與活動指標顯示。",
    "home.f1.link": "前往地圖 →",
    "home.f2.title": "數據分析",
    "home.f2.body":
      "月度趨勢、地區分佈、單次行動規模等統計圖表，全部由實際資料即時運算生成。",
    "home.f2.link": "前往分析 →",
    "home.f3.title": "活動指標",
    "home.f3.body":
      "按「最近一次行動時間」劃分高、中、低活動程度，計算方法公開透明，並非風險預測。",
    "home.f3.link": "了解計算方法 →",
    "home.latest.eyebrow": "最新動態",
    "home.latest.title": "最新行動紀錄",
    "home.latest.sub": "最近公佈的野豬捕捉行動，完整清單可於地圖頁瀏覽。",
    "home.latest.all": "在地圖查看全部紀錄 →",
    "home.count.unit": "{n} 頭",
    "home.data.note":
      "本站收錄漁護署「野豬滋擾」網頁公佈之捕捉行動紀錄，為靜態資料快照，並非即時監測，亦非全港野豬數量普查；地點位置為近似位置。使用前請細閱",
    "home.latest.empty": "暫無紀錄。",
    "home.loadfail": "資料載入失敗，請稍後重試。",

    "map.title": "篩選",
    "map.q.label": "搜尋地點",
    "map.q.placeholder": "例如：南生圍",
    "map.district": "地區",
    "map.district.all": "全部地區",
    "map.district.none": "（無紀錄）",
    "map.level": "活動程度",
    "map.level.all": "全部程度",
    "map.level.high": "高活動（30 天內）",
    "map.level.medium": "中度活動（31–90 天）",
    "map.level.low": "低度活動（91–180 天）",
    "map.level.past": "較早紀錄（180 天以上）",
    "map.date": "行動日期",
    "map.date.from": "開始日期",
    "map.date.to": "結束日期",
    "map.mincount": "野豬數目下限",
    "map.mincount.placeholder": "全部",
    "map.source": "資料來源",
    "map.source.all": "全部來源",
    "map.source.afcd": "官方行動紀錄",
    "map.source.community": "公眾報告",
    "map.reset": "重設篩選",
    "map.readonly_note": "篩選只改變畫面顯示，不會修改任何資料。",
    "map.mark_note": "標記顏色按「最近一次行動時間」劃分，不代表危險程度。",
    "map.summary":
      "符合 {records} 筆紀錄 · 共 {boars} 頭野豬 · {locations} 個地點",
    "map.list.label": "符合篩選的紀錄",
    "map.list.cap":
      "僅顯示最近 {cap} 筆，合共 {total} 筆，請善用篩選收窄範圍。",
    "map.legend.title": "最近行動時間",
    "map.legend.community": "紫框 = 公眾報告（未經官方核實）",
    "map.layer.records": "行動紀錄",
    "map.layer.activity": "活動指標範圍",
    "map.layer.heat": "熱力圖",
    "map.jump": "跳至地圖",
    "map.loadfail": "資料載入失敗，請重新整理頁面。",

    "popup.when.today": "資料截止日當天",
    "popup.when.days": "{days} 天前",
    "popup.count": "野豬數目",
    "popup.count.value": "{n} 頭",
    "popup.count.withband": "{value}（約 {band} 頭）",
    "popup.district": "所屬地區",
    "popup.actionno": "行動編號",
    "popup.level": "最近程度",
    "popup.notes": "補充",
    "popup.source": "資料來源：漁護署公佈之捕捉行動 · 位置為近似地點",
    "popup.source.community": "資料來源：公眾報告（未經官方核實）· 位置為近似位置",
    "popup.location_centre": "（位置以地區中心顯示）",
    "popup.activity.title": "活動指標 · 地點摘要",
    "popup.activity.level": "目前程度",
    "popup.activity.records": "紀錄次數",
    "popup.activity.records_value": "{n} 次",
    "popup.activity.boars": "野豬數目",
    "popup.activity.last": "最近行動",
    "popup.activity.note":
      "程度按最近一次行動時間劃分（{description}），並非風險預測。",

    "analytics.subtitle":
      "以下圖表由本站收錄的行動紀錄即時運算而成；可按日期與地區篩選查看不同切面。",
    "analytics.from": "開始日期",
    "analytics.to": "結束日期",
    "analytics.district": "地區",
    "analytics.reset": "重設",
    "analytics.viewmap": "在地圖查看 →",
    "analytics.sum.records": "行動紀錄",
    "analytics.sum.records_sub": "符合篩選條件",
    "analytics.sum.boars": "野豬數目",
    "analytics.sum.boars_sub": "行動合計",
    "analytics.sum.locations": "涉及地點",
    "analytics.sum.locations_sub": "不重複地點",
    "analytics.sum.avg": "平均每宗",
    "analytics.sum.avg_sub": "野豬數目／行動",
    "analytics.chart.monthly": "月度趨勢",
    "analytics.chart.monthly_sub":
      "每月行動次數（柱）與野豬數目（線）。注意：收錄時段之間可能存在空檔，詳見",
    "analytics.chart.district": "地區分佈",
    "analytics.chart.district_sub": "各地區的行動次數與野豬數目。",
    "analytics.chart.bands": "單次行動規模",
    "analytics.chart.bands_sub": "每次行動捕獲野豬數目的分佈。",
    "analytics.chart.top": "紀錄最多的地點（前 10）",
    "analytics.chart.top_sub": "按行動紀錄次數排列。",
    "analytics.ds.records": "行動次數",
    "analytics.ds.boars": "野豬數目",
    "analytics.axis.records": "行動次數",
    "analytics.axis.boars": "野豬數目",
    "analytics.band.1": "1 頭",
    "analytics.band.2_3": "2–3 頭",
    "analytics.band.4_6": "4–6 頭",
    "analytics.band.7p": "7 頭或以上",
    "analytics.table.district": "地區統計",
    "analytics.table.district_sub": "點擊「查看」可在地圖上開啟該區的篩選結果。",
    "analytics.th.district": "地區",
    "analytics.th.actions": "行動次數",
    "analytics.th.boars": "野豬數目",
    "analytics.th.locations": "涉及地點",
    "analytics.th.share": "佔比",
    "analytics.th.view": "地圖",
    "analytics.view": "查看",
    "analytics.table.location": "地點活動指標",
    "analytics.table.location_sub":
      "按最近一次行動時間劃分程度；指標只描述紀錄時間的新近度，",
    "analytics.table.location_sub_strong": "並非風險預測",
    "analytics.th.location": "地點",
    "analytics.th.recordcount": "紀錄次數",
    "analytics.th.last": "最近行動",
    "analytics.th.activity": "活動程度",
    "analytics.indicator_link": "完整計算方法見",
    "analytics.indicator_link_target": "活動指標說明",
    "analytics.loadfail": "資料載入失敗，請重新整理頁面。",
    "analytics.unzoned": "未分區",

    "about.subtitle": "About & Methodology",
    "map2.districtcount": "（{n}）",

    "date.unknown": "—",
  },

  en: {
    "doc.title.home": "HK Wild Boar Traces — Hong Kong Wild Boar Information Platform",
    "doc.title.map": "Activity Map — HK Wild Boar Traces",
    "doc.title.analytics": "Data Analytics — HK Wild Boar Traces",
    "doc.title.about": "About the Project & Data — HK Wild Boar Traces",
    "doc.title.report": "Report a Sighting — HK Wild Boar Traces",
    "doc.title.404": "Page Not Found — HK Wild Boar Traces",

    "a11y.skip": "Skip to main content",
    "a11y.nav": "Main navigation",
    "a11y.menu": "Open or close the main menu",
    "a11y.lang.group": "語言 Language",
    "a11y.lang.zh": "切換至繁體中文",
    "a11y.lang.en": "Switch to English",

    "lang.zh": "中文",
    "lang.en": "EN",

    "nav.home": "Home",
    "nav.map": "Activity Map",
    "nav.analytics": "Data Analytics",
    "nav.report": "Report a sighting",
    "nav.about": "About",

    "banner.snapshot": "Data snapshot",
    "banner.source": "Source",
    "banner.source_name": "AFCD",
    "banner.nonrealtime": "not real-time statistics",
    "banner.learn": "Learn about data limitations",

    "foot.tagline":
      "An open, read-only information platform on wild boar activity in Hong Kong. Compiled from publicly available government data, for reference only — not a risk advisory.",
    "foot.browse": "Browse",
    "foot.data": "Data",
    "foot.legal": "Legal & Privacy",
    "foot.afcd": "AFCD \"Wild Pig Nuisance\" publication",
    "foot.data_notes": "Data Notes & Limitations",
    "foot.privacy": "Privacy Statement",
    "foot.copyright": "Copyright & Ownership",
    "foot.copyright_line": "© 2026 Ma Ying Yuen & Project Team. All Rights Reserved.",
    "foot.ownership":
      "Original website design, code, and project materials are owned by Ma Ying Yuen and the Project Team unless otherwise stated. Third-party data, maps, trademarks, and external resources remain the property of their respective owners.",
    "foot.readonly":
      "Data source: wild boar capture-action information published by the AFCD, plus sighting reports submitted by the public through our form · Data on this website cannot be edited; sighting reports are welcome via the \"Report a sighting\" page.",

    "home.cta.report": "Report a sighting",
    "home.tag.community": "Public",

    "report.eyebrow": "Community reports",
    "report.title": "Report a wild boar sighting",
    "report.lead":
      "Seen wild boars nearby? Fill in the form below to submit a sighting report and help improve this platform's community data. Please read the notes first.",
    "report.form.title": "Fill in the report form",
    "report.form.loading": "Loading the form…",
    "report.form.unavailable":
      "The report form is coming soon — please check back later.",
    "report.form.open": "Open the form in a new tab →",
    "report.how.title": "What happens to your report",
    "report.how.body":
      "Submitted reports are stored automatically in this platform's data sheet and appear on the map after the next data update (currently monthly), labelled as \"community report (not officially verified)\". You can view community reports on their own using the \"Data source\" filter on the map.",
    "report.safety.title": "Before you submit",
    "report.safety.body":
      "Do not include any personal information (names, phone numbers, addresses, etc.); an approximate location is enough. Report contents are published publicly — by submitting you agree to publication (obvious phone numbers and e-mail addresses are redacted automatically). In an emergency, call 999 or the government hotline 1823 immediately — do not use this form.",
    "report.privacy.title": "Privacy",
    "report.privacy.body":
      "The form is provided by Google Forms; submissions are handled under Google's terms of service. This website only publishes the report content you enter and never publishes your identity.",

    "home.hero.tagline": "Hong Kong Wild Boar Information Platform · Open · Read-only",
    "home.hero.lead":
      "Wild boar capture-action records published by Hong Kong's Agriculture, Fisheries and Conservation Department (AFCD), presented through maps and charts so that anyone can explore the distribution, trends and recent activity of wild boars. No login required.",
    "home.cta.map": "Open the Activity Map",
    "home.cta.analytics": "View Data Analytics",
    "home.snap.title": "Data Snapshot",
    "home.snap.records": "Action records",
    "home.snap.boars": "Wild boars",
    "home.snap.locations": "Locations",
    "home.snap.districts": "Districts covered",
    "home.snap.asof": "Data as of {date} · Updated {updated}",
    "home.f1.title": "Explore the Map",
    "home.f1.body":
      "Browse the location and scale of every action record on an interactive map, with marker clustering, a heatmap and the activity indicator.",
    "home.f1.link": "Open the map →",
    "home.f2.title": "Data Analytics",
    "home.f2.body":
      "Monthly trends, district distribution, operation size and more — every chart is computed live from the actual records.",
    "home.f2.link": "Open the analytics →",
    "home.f3.title": "Activity Indicator",
    "home.f3.body":
      "Locations are grouped into higher, moderate and lower activity by the recency of the last record. The method is transparent — and it is not a risk forecast.",
    "home.f3.link": "How it is calculated →",
    "home.latest.eyebrow": "Latest updates",
    "home.latest.title": "Latest Action Records",
    "home.latest.sub":
      "The most recently published capture actions. The full list is available on the map page.",
    "home.latest.all": "View all records on the map →",
    "home.count.unit": "{n} boar(s)",
    "home.data.note":
      "The records shown here are capture actions published on the AFCD \"Wild Pig Nuisance\" webpage. They are a static snapshot — not real-time monitoring and not a territory-wide wild boar population survey; locations are approximate. Please read",
    "home.latest.empty": "No records yet.",
    "home.loadfail": "Failed to load data. Please try again later.",

    "map.title": "Filters",
    "map.q.label": "Search location",
    "map.q.placeholder": "e.g. Nam Sang Wai",
    "map.district": "District",
    "map.district.all": "All districts",
    "map.district.none": "(no records)",
    "map.level": "Activity level",
    "map.level.all": "All levels",
    "map.level.high": "Higher activity (within 30 days)",
    "map.level.medium": "Moderate activity (31–90 days)",
    "map.level.low": "Lower activity (91–180 days)",
    "map.level.past": "Earlier records (180+ days)",
    "map.date": "Action date",
    "map.date.from": "From date",
    "map.date.to": "To date",
    "map.mincount": "Minimum boar count",
    "map.mincount.placeholder": "Any",
    "map.source": "Data source",
    "map.source.all": "All sources",
    "map.source.afcd": "Official action records",
    "map.source.community": "Community reports",
    "map.reset": "Reset filters",
    "map.readonly_note":
      "Filters only change what is displayed — they never modify the data.",
    "map.mark_note":
      "Marker colours reflect when the most recent action took place — they do not indicate danger.",
    "map.summary":
      "{records} records · {boars} wild boars · {locations} locations",
    "map.list.label": "Matching records",
    "map.list.cap":
      "Showing the latest {cap} of {total} matching records — refine the filters to narrow the list.",
    "map.legend.title": "Most recent action",
    "map.legend.community": "Purple outline = community report (not officially verified)",
    "map.layer.records": "Action records",
    "map.layer.activity": "Activity indicator",
    "map.layer.heat": "Heatmap",
    "map.jump": "Skip to map",
    "map.loadfail": "Failed to load data. Please refresh the page.",

    "popup.when.today": "on the data cut-off date",
    "popup.when.days": "{days} days ago",
    "popup.count": "Wild boars",
    "popup.count.value": "{n} boar(s)",
    "popup.count.withband": "{value} (reported: {band})",
    "popup.district": "District",
    "popup.actionno": "Action no.",
    "popup.level": "Recency",
    "popup.notes": "Notes",
    "popup.source":
      "Source: capture actions published by AFCD · location is approximate",
    "popup.source.community":
      "Source: community report (not officially verified) · location is approximate",
    "popup.location_centre": "(shown at the district centre)",
    "popup.activity.title": "Activity indicator · location summary",
    "popup.activity.level": "Current level",
    "popup.activity.records": "Records",
    "popup.activity.records_value": "{n} action(s)",
    "popup.activity.boars": "Wild boars",
    "popup.activity.last": "Latest action",
    "popup.activity.note":
      "The level reflects the recency of the last action ({description}); it is not a risk forecast.",

    "analytics.subtitle":
      "All charts below are computed live from the records on this website. Filter by date and district to explore different views.",
    "analytics.from": "From date",
    "analytics.to": "To date",
    "analytics.district": "District",
    "analytics.reset": "Reset",
    "analytics.viewmap": "View on the map →",
    "analytics.sum.records": "Action records",
    "analytics.sum.records_sub": "matching the filters",
    "analytics.sum.boars": "Wild boars",
    "analytics.sum.boars_sub": "total across actions",
    "analytics.sum.locations": "Locations",
    "analytics.sum.locations_sub": "unique locations",
    "analytics.sum.avg": "Average per action",
    "analytics.sum.avg_sub": "wild boars / action",
    "analytics.chart.monthly": "Monthly trend",
    "analytics.chart.monthly_sub":
      "Monthly number of actions (bars) and wild boars (line). Note: there may be gaps between the covered periods — see",
    "analytics.chart.district": "District distribution",
    "analytics.chart.district_sub": "Actions and wild boars by district.",
    "analytics.chart.bands": "Operation size",
    "analytics.chart.bands_sub":
      "Distribution of wild boars captured per action.",
    "analytics.chart.top": "Locations with most records (Top 10)",
    "analytics.chart.top_sub": "Ranked by the number of action records.",
    "analytics.ds.records": "Actions",
    "analytics.ds.boars": "Wild boars",
    "analytics.axis.records": "Actions",
    "analytics.axis.boars": "Wild boars",
    "analytics.band.1": "1 boar",
    "analytics.band.2_3": "2–3 boars",
    "analytics.band.4_6": "4–6 boars",
    "analytics.band.7p": "7 or more",
    "analytics.table.district": "District statistics",
    "analytics.table.district_sub":
      "Select \"View\" to open that district's filtered results on the map.",
    "analytics.th.district": "District",
    "analytics.th.actions": "Actions",
    "analytics.th.boars": "Wild boars",
    "analytics.th.locations": "Locations",
    "analytics.th.share": "Share",
    "analytics.th.view": "Map",
    "analytics.view": "View",
    "analytics.table.location": "Location activity indicator",
    "analytics.table.location_sub":
      "Levels are based on how recent the last action was. The indicator only describes record recency —",
    "analytics.table.location_sub_strong": "it is not a risk forecast",
    "analytics.th.location": "Location",
    "analytics.th.recordcount": "Records",
    "analytics.th.last": "Latest action",
    "analytics.th.activity": "Activity level",
    "analytics.indicator_link": "The full method is explained in",
    "analytics.indicator_link_target": "the activity indicator explanation",
    "analytics.loadfail": "Failed to load data. Please refresh the page.",
    "analytics.unzoned": "Unzoned",

    "about.subtitle": "About & Methodology",
    "map2.districtcount": " ({n})",

    "date.unknown": "—",
  },
};

let current = "zh";

/** Current UI language: "zh" or "en". */
export function currentLang() {
  return current;
}

/** Translate a key with optional {placeholder} interpolation. */
export function t(key, vars) {
  const table = DICT[current];
  let text = table[key] ?? DICT.zh[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Pick the right field from a bilingual data object ("x" / "x_en"). */
export function metaField(obj, field) {
  if (!obj) return "";
  if (current === "en") return obj[`${field}_en`] ?? obj[field] ?? "";
  return obj[field] ?? obj[`${field}_en`] ?? "";
}

/** Lang-aware date formatting. */
export function formatDate(iso) {
  if (!iso) return t("date.unknown");
  const [y, m, d] = iso.split("-").map(Number);
  if (current === "en") {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d} ${months[m - 1]} ${y}`;
  }
  return `${y}年${m}月${d}日`;
}

/** District display name for the current language. */
export function districtName(zh, en) {
  if (current === "en") return en || zh || t("analytics.unzoned");
  return zh || en || t("analytics.unzoned");
}

/** Apply all data-i18n attributes within a root element. */
export function applyDOM(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  if (root === document) {
    const titleKey = document.documentElement.dataset.titleI18n;
    if (titleKey) document.title = t(titleKey);
  }
}

/** Change the language, persist it, re-apply the DOM and notify listeners. */
export function setLang(lang) {
  if (!DICT[lang] || lang === current) return;
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang === "zh" ? "zh-HK" : "en";
  applyDOM();
  document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.langBtn === lang));
  });
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

/** Initialise language from storage / browser, apply, wire the switcher. */
export function initI18n() {
  const stored = localStorage.getItem(STORAGE_KEY);
  current = stored === "en" || stored === "zh"
    ? stored
    : (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
  document.documentElement.lang = current === "zh" ? "zh-HK" : "en";
  applyDOM();
  document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.langBtn === current));
    btn.addEventListener("click", () => setLang(btn.dataset.langBtn));
  });
}

/** Escape untrusted strings before inserting into HTML. */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

/** Days between an ISO date and the dataset reference date. */
export function daysSince(iso, referenceIso) {
  return Math.round((new Date(referenceIso) - new Date(iso)) / 86400000);
}

/** Recency level key for an ISO date, mirroring the pipeline thresholds. */
export function levelOfKey(iso, referenceIso) {
  const days = daysSince(iso, referenceIso);
  return days <= 30 ? "high" : days <= 90 ? "medium" : days <= 180 ? "low" : "past";
}

/** Fetch a JSON file from /data with a helpful error message. */
export async function loadJSON(path) {
  const resp = await fetch(path);
  if (!resp.ok) {
    throw new Error(`無法載入 ${path}（HTTP ${resp.status}）`);
  }
  return resp.json();
}
