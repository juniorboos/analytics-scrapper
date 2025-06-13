console.log("Popup script loaded");
const uploadButton = document.getElementById("upload");

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
    reader = new FileReader();
    const parsedList = [];
    const statusEl = document.getElementById("status");
    const uploadingEl = document.createElement("p");
    uploadingEl.id = "uploadingStatus";
    uploadingEl.textContent = `Uploading ${fileList.length} file(s)...`;
    statusEl.appendChild(uploadingEl);
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
          uploadingEl.textContent = "✅ Data pushed successfully!";
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
    document.getElementById("status").innerText = "✅ Export complete!";
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.status === "upload-done") {
    document.getElementById("status").innerText = "✅ Upload complete!";
  }
});
