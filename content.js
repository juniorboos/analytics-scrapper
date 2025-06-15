console.log("🚀 content.js loaded");
(async () => {
  console.log("🚀 Content script injected and running!");
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const findExportItem = async (timeout = 3000) => {
    const interval = 100;
    const maxTries = timeout / interval;

    for (let i = 0; i < maxTries; i++) {
      const candidates = Array.from(document.querySelectorAll("li"));
      console.log("Looking for Export as CSV...", candidates.length);

      for (const li of candidates) {
        const spans = li.querySelectorAll("span");
        for (const span of spans) {
          if (span.textContent.trim() === "Export as CSV") {
            return li;
          }
        }
      }

      await delay(interval);
    }

    return null;
  };

  const moreButtons = Array.from(
    document.querySelectorAll('button[aria-label="More"]')
  );

  for (const button of moreButtons) {
    button.click();
    await delay(100); // Wait for portal menu to start rendering

    const exportItem = await findExportItem();

    console.log("Found export item:", exportItem);
    if (exportItem) {
      exportItem.click();
      await delay(1000); // Wait for download to trigger
    } else {
      console.warn("Export as CSV not found for a button");
    }
  }

  console.log("All exports attempted.");
  chrome.runtime?.sendMessage?.({ status: "export-done" });
})();
