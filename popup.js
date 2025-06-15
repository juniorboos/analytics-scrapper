console.log("Popup script loaded");
const uploadButton = document.getElementById("upload");
const statusEl = document.getElementById("status");
statusEl.innerText = "Ready to download and upload files";

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function handleFiles() {
  try {
    const fileList = this.files;
    const parsedList = [];
    statusEl.innerText = `Uploading ${fileList.length} file(s)...`;
    for (i = 0; i < fileList.length; i++) {
      file = fileList[i];
      text = await readFileAsText(file);

      const rows = text
        .trim()
        .split("\n")
        .map((line) => line.split(","));
      parsedList.push({ name: file.name, rows });
    }

    // Send message to background.js for auth and upload
    chrome.runtime.sendMessage(
      {
        type: "PUSH_TO_SHEETS",
        payload: {
          tables: parsedList,
        },
      },
      (response) => {
        if (response?.success) {
          statusEl.innerText = "✅ Data pushed successfully!";
          console.log("✅ Data pushed successfully:", response.response);
        } else {
          console.error("❌ Failed to push data:", response?.error);
        }
      }
    );
    uploadButton.value = "";
  } catch (error) {
    document.getElementById("status").innerText = "Error:" + error.message;
  }
}

uploadButton.addEventListener("change", handleFiles, false);

document.getElementById("runExport").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    console.error("No active tab found.");
    return;
  }

  document.getElementById("status").innerText = "Downloading files...";

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    console.log("✅ content.js injected.");
  } catch (err) {
    console.error("❌ Failed to inject:", err);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.status === "export-done") {
    document.getElementById("status").innerText = "✅ Download complete!";
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.status === "upload-done") {
    document.getElementById("status").innerText = "✅ Upload complete!";
  }
});
