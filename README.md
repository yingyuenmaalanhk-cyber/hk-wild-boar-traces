# 豬絲馬跡 · HK Wild Boar Traces

公開、唯讀的香港野豬活動資訊平台。整理漁農自然護理署（AFCD）公佈的野豬捕捉行動紀錄，
以互動地圖、統計圖表與活動指標呈現，部署於 GitHub Pages，毋須任何後端伺服器。

An open, read-only, GIS-driven information platform visualising wild boar
capture-action records published by Hong Kong's AFCD. Pure static site —
no backend, no database, no tracking.

## 功能 Features

- **活動地圖** — Leaflet 互動地圖：標記聚合、活動指標範圍、熱力圖（OpenStreetMap 底圖）
- **篩選與搜尋** — 按日期、地區、活動程度、野豬數目下限及地點關鍵字篩選（唯讀，不改變資料）
- **數據分析** — 月度趨勢、地區分佈、行動規模、熱門地點圖表（Chart.js，由資料即時運算）
- **活動指標** — 按「最近一次行動時間」劃分高／中／低／較早四級，計算方法公開於網站
- **行動裝置友善** — 桌面／平板／手機版面，關注可及性（鍵盤導覽、色彩以外之程度標示）
- **私隱友善** — 無 Cookies、無追蹤、無帳戶系統；地圖圖塊來源已於私隱聲明披露

## 資料 Data

| 檔案 | 內容 |
| --- | --- |
| `data/sightings.geojson` | 逐項行動紀錄（GeoJSON Point，含日期、地點、分區、數目） |
| `data/statistics.json` | 預先運算的統計（月度、分區、地點、活動程度） |
| `data/meta.json` | 資料來源、涵蓋範圍、活動級別定義、限制說明 |
| `data/districts.json` | 香港 18 區清單及紀錄數 |

> 資料為官方公開資料之整理快照，並非即時、亦非完整歷史資料庫；官方網頁僅逐項列出
> 最近期行動。使用前請閱讀網站「關於計劃」頁的資料限制。

## 更新資料 Updating the data

以 Python 標準庫寫成，無需安裝依賴（Python 3.10+）：

```bash
# 擷取 AFCD 網頁最新逐項紀錄 + 併入舊有 CSV 匯出，重新地理編碼並輸出 data/*
python tools/prepare_data.py --legacy-csv path/to/mysql_coordinates.csv

# 同時併入公眾報告（Google Sheets 已發佈的 CSV 網址）
python tools/prepare_data.py --community-url "https://docs.google.com/..."

# 僅用已快取的地理編碼離線重建（不連網）
python tools/prepare_data.py --offline --afcd-file tools/raw/afcd_page.html
```

- 首次執行會以每 1.1 秒一個請求的速度向 OpenStreetMap Nominatim 查詢新地點座標，
  結果快取於 `tools/geocode_cache.json`，之後再執行幾乎即時完成。
- 官方逐項紀錄會累積存檔於 `tools/afcd_records.json`（官方網頁只列出最近期行動）。
- GitHub Actions 會在每月 1 日自動執行上述流程（見 `.github/workflows/update-data.yml`），
  有新資料才會 commit 並自動重新發佈；亦可在 Actions 頁手動觸發。

## 公眾報告 Community reports

1. 以你的 Google 帳號建立 Google Form，題目建議：
   - 行動日期 Date of sighting（日期，必填）
   - 地區 District（下拉：18 區中英對照，必填）
   - 地點描述 Location description（短答案，必填）
   - 野豬約略數量 Approx. number of boars（下拉：1 / 2–3 / 4–6 / 7 或以上，必填）
   - 補充資料 Notes（長答案，選填）
   - 表單說明請提醒：勿填個人資料、位置大約即可、緊急情況請報警或致電 1823
2. 表單 → 回應 → 連結至 Google 試算表 → 檔案 → 分享 → 發佈到網頁（CSV 格式）
3. 把該 CSV 網址加到倉庫 Settings → Secrets and variables → Actions → **Variables**，
   名稱 `COMMUNITY_SHEET_CSV_URL`
4. 把表單連結填入 `assets/js/config.js` 的 `googleFormLinkUrl` / `googleFormEmbedUrl`
   （embed 網址為 `.../viewform?embedded=true`）

提交的報告會在下次自動更新時直接上架，標示為「公眾報告（未經官方核實）」；
在 Google Sheet 刪除某列，下次更新即會從網站移除。

## 本地預覽 Local preview

任何靜態伺服器皆可（需要 HTTP，直接開檔案無法載入 JSON）：

```bash
python -m http.server 8080
# 瀏覽 http://localhost:8080
```

## 部署到 GitHub Pages Deployment

本網站已部署於：`https://yingyuenmaalanhk-cyber.github.io/hk-wild-boar-traces/`
（源碼倉庫：`https://github.com/yingyuenmaalanhk-cyber/hk-wild-boar-traces`）

採用 GitHub Pages「Deploy from a branch」模式：每次 push 到 `main` 分支，
GitHub 會自動重新發佈網站，無需任何手動步驟。

如需搬遷到其他倉庫或用戶名，請同步更新 `sitemap.xml`、`robots.txt`
及 `assets/js/site.js` 內的 `SITE.repoUrl`。

## 私隱審計 Privacy audit

本倉庫以「Privacy by Design」原則維護：不含任何個人姓名、聯絡方式、學校資訊、
本機路徑、金鑰或憑證；不使用任何追蹤或 Cookies。每次發佈前執行：

```bash
python tools/check_privacy.py
```

它會掃描所有將發佈的文字檔，攔截電郵、本機路徑、學校識別字串、硬編碼密碼／金鑰、
學號樣式字串等內容（發現即以非零退出碼失敗）。

**Git 歷史注意**：刪除檔案不會從 Git 歷史移除內容。請確保歷史中從未提交過
含有個人資料或密碼的檔案；如曾提交，需先清理歷史（例如 `git filter-repo`）
或以乾淨的全新倉庫發佈。

## 目錄結構 Repository layout

```
├── index.html              # 主頁
├── map.html                # 活動地圖（Leaflet）
├── analytics.html          # 數據分析（Chart.js）
├── about.html              # 資料來源、方法、限制、私隱聲明
├── 404.html
├── assets/
│   ├── css/style.css       # 設計系統
│   ├── js/                 # site / data / map / charts / home / about
│   └── vendor/             # Leaflet、markercluster、leaflet.heat、Chart.js（本地託管）
├── data/                   # 靜態資料集（唯讀）
├── tools/
│   ├── prepare_data.py     # 資料管線（擷取 → 地理編碼 → 統計 → JSON）
│   ├── check_privacy.py    # 私隱審計腳本
│   └── geocode_cache.json  # 地理編碼快取
├── .github/workflows/deploy.yml
├── robots.txt / sitemap.xml / .nojekyll
└── LICENSE (MIT)
```

## 授權 License

程式碼以 [MIT License](LICENSE) 釋出。資料整理自香港特區政府漁農自然護理署公開資料，
地圖圖塊由 OpenStreetMap 貢獻者提供，各自條款適用。
