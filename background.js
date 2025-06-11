chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});

const now = new Date();
const folderName = `vercel_analytics/${now.toISOString().split("T")[0]}`; // e.g. csv_exports/2025-05-26

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (item.filename.endsWith(".csv") && item.filename.includes("Top")) {
    const newFilename = `${folderName}/${item.filename}`;
    suggest({ filename: newFilename });
  }
});
