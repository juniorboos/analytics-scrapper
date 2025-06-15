# 📊 Analytics scrapper

This Chrome Extension lets you upload one or more CSV files and automatically appends their data into a Google Sheet. Each CSV is treated as a separate table, inserted horizontally with custom formatting. Perfect if you're poor like me and want to keep your analytics data after 30 days.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/P5P41FZQVI)
---

## 🚀 Features

- ✅ Upload multiple CSV files
- 📁 Automatically parse and format into tables
- 🔄 Avoids duplicate table headers
- ➕ Appends new data if the table already exists
- ↔️ Aligns tables **horizontally** with one-column spacing
- 🗓️ Extracts and includes date from filename
- 🔐 Google Sheets API integration via OAuth token
- 📦 Lightweight UI using TailwindCSS

---

## 🧱 Project Structure
```
extension/
├── background.js # Main logic and Sheets API integration
├── content.js # Export CSV logic.
├── config.js # Stores constants (e.g., Spreadsheet ID)
├── popup.html # Extension UI with Tailwind styling
├── popup.js # File parsing, UI event handling
├── manifest.json # Chrome Extension config
└── README.md
```

---

## 🔧 Setup

### 1. Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select an existing one)
3. Enable the **Google Sheets API**
4. Create OAuth 2.0 credentials and add it to `manifest.json` (clone `manifest_example.json`)
6. Set the redirect URI to: `https://<your-extension-id>.chromiumapp.org/` (you can find the extension id at `chrome://extensions/`)

> ⚠️ Be sure to whitelist your extension ID.

---

### 2. Set your configuration

In `config.js` (clone from `config_example.json`):

```js
export default {
   SPREADSHEET_ID: "your-spreadsheet-id", // you can find this in the spreadsheet URL
};
```

### 3. Load the Extension
   
1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `analytics-scrapper/` folder

### 🧪 How It Works
1. Click 📤 "Upload CSVs"
2. The extension reads and parses each CSV
3. It checks your Google Sheet:
  - If the table already exists, it appends only new rows
  - If not, it creates a formatted table:
    - Merged title row (e.g., Top Devices)
    - Header row
    - Data rows
    - A separate column for the date (from filename)
4. Tables are laid out side-by-side across the sheet

### Supported File Name Format
The extension extracts table name and date from files like: `Top Devices - Jun 3, 1_00 - Jun 10.csv`
- Table name: `Top Devices`
- Date: `Jun 3 - Jun 10`

