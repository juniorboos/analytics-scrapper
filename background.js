import CONFIG from "./config.js";

const now = new Date();
const folderName = `analytics/${now.toISOString().split("T")[0]}`; // e.g. analytics/2025-05-26

function columnToLetter(col) {
  let letter = "";
  while (col > 0) {
    let mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - mod) / 26);
  }
  return letter;
}

function extractDateRangeFromFilename(filename) {
  const match = filename.match(/- ([A-Za-z]+ \d+),[^-]*- ([A-Za-z]+ \d+)/);
  if (match) {
    return `${match[1]} - ${match[2]}`;
  }
  return "Unknown Date";
}

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(token);
    });
  });
}

const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}`;
async function getSheetValues(token, range) {
  const url = `${baseUrl}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch sheet values: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  return data.values || [];
}

async function writeOrAppendNamedTable(
  token,
  sheetName,
  tableName,
  headers,
  rows
) {
  const existingData = await getSheetValues(token, sheetName);
  const formattedTableName = tableName.split(" - ")[0].trim();
  const tableTitleRowIndex = existingData.findIndex((row) =>
    row.some(
      (cell) => typeof cell === "string" && cell.trim() === formattedTableName
    )
  );

  if (tableTitleRowIndex === -1) {
    console.log("Table not found. Writing new table...");

    // Find the next empty column (horizontal layout)
    let maxCols = 0;
    for (const row of existingData) {
      if (row.length > maxCols) maxCols = row.length;
    }

    const startColIndex = maxCols === 0 ? 0 : maxCols + 1; // leave 1 col spacing
    const colLetter = columnToLetter(startColIndex + 1); // +1 for 1-indexed
    const tableWidth = headers.length;
    const endColLetter = columnToLetter(startColIndex + tableWidth);

    const range = `${sheetName}!${colLetter}1:${endColLetter}${
      rows.length + 2
    }`;

    const formattedValues = [
      [formattedTableName, ...Array(tableWidth - 1).fill("")], // Title row
      headers,
      ...rows,
    ];

    return appendToSheet(token, range, formattedValues);
  } else {
    console.log("Table exists. Appending to it...");

    // Find how many rows are below the title (to find where to append)
    let insertRowIndex = tableTitleRowIndex + 1;

    // The title is at some column offset — need to find its column
    const titleRow = existingData[tableTitleRowIndex];
    const titleColIndex = titleRow.findIndex(
      (cell) => cell === formattedTableName
    );

    // Count how many rows belong to this table (based on empty row or next title)
    while (
      insertRowIndex < existingData.length &&
      existingData[insertRowIndex]
        .slice(titleColIndex, titleColIndex + headers.length)
        .some((cell) => cell.trim() !== "")
    ) {
      insertRowIndex++;
    }

    const startColLetter = columnToLetter(titleColIndex + 1);
    const endColLetter = columnToLetter(titleColIndex + headers.length);

    const range = `${sheetName}!${startColLetter}${
      insertRowIndex + 1
    }:${endColLetter}${insertRowIndex + rows.length}`;

    return appendToSheet(token, range, rows);
  }
}

async function appendToSheet(token, range, values) {
  const url = `${baseUrl}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const body = { values: values };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Sheets API error: ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

async function pushCsvDataToSheet(tables) {
  try {
    const token = await getAccessToken();

    for (const table of tables) {
      const { name: fileName, rows: csvDataArray } = table;

      const [header, ...rows] = csvDataArray;

      if (!csvDataArray || csvDataArray.length === 0) {
        console.warn(`No data found in ${fileName}. Skipping.`);
        continue;
      }

      // Ensure the first row is the header
      if (csvDataArray[0].length === 0) {
        console.warn(`Empty header in ${fileName}. Skipping.`);
        continue;
      }

      const date = extractDateRangeFromFilename(fileName);

      await writeOrAppendNamedTable(
        token,
        "Data",
        fileName,
        ["Date", ...header],
        rows.map((row, idx) => (idx === 0 ? [date, ...row] : ["", ...row])) // Remaining rows as data
      );
    }

    console.log("Data appended:", tables);
  } catch (error) {
    console.error("Error pushing data to sheet:", error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PUSH_TO_SHEETS") {
    const { tables } = message.payload;

    pushCsvDataToSheet(tables)
      .then((response) => {
        sendResponse({ success: true, response });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    // Indicate async response
    return true;
  }
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (item.filename.endsWith(".csv") && item.filename.includes("Top")) {
    const newFilename = `${folderName}/${item.filename}`;
    suggest({ filename: newFilename });
  }
});
