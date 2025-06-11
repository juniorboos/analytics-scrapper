console.log("Popup script loaded");
async function handleCSVUpload() {
  try {
    const folderHandle = await window.showDirectoryPicker();
    for await (const [name, handle] of folderHandle.entries()) {
      if (name.endsWith(".csv")) {
        const file = await handle.getFile();
        const text = await file.text();

        const rows = text
          .trim()
          .split("\n")
          .map((line) => line.split(","));

        const sheetName = name.match(/^Top (.*?) -/)?.[1] || "Data";

        chrome.identity.getAuthToken({ interactive: true }, async (token) => {
          await fetch(
            "https://script.google.com/macros/s/AKfycbyQx0-ZJEKHKTJ4eSHiNmdAz5z-Yc8sURZjuwgpXybLvnvjaRTXPuwnE9YRS89LkO4s/exec",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ csv: rows, sheetName }),
            }
          );
        });
      }
    }

    alert("✅ All CSVs uploaded to Google Sheets!");
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Usuário cancelou a seleção da pasta.");
      // Opcional: mostrar mensagem ao usuário, ou simplesmente ignorar
    } else {
      console.error("Erro inesperado:", error);
      alert("Ocorreu um erro ao tentar carregar os arquivos.");
    }
  }
}

document.getElementById("upload").addEventListener("click", handleCSVUpload);

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.status === "done") {
    document.getElementById("status").innerText = "✅ Export complete!";
  }
});
