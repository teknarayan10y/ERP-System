// Server/services/fileParser.js
// Shared utility — parse any uploaded file (PDF, CSV, Excel, JSON, TXT, etc.) into plain text
const path = require("path");

function parseCsvToText(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return csvText;
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    return headers.map((h, i) => h + ": " + (vals[i] || "")).join(" | ");
  });
  return [headers.join(" | ")].concat(rows).join("\n");
}

function parseJsonToText(jsonText) {
  try {
    const obj = JSON.parse(jsonText);
    function flatten(o, prefix) {
      if (!prefix) prefix = "";
      var result = "";
      if (Array.isArray(o)) {
        o.forEach((item, idx) => { result += flatten(item, prefix + "[" + idx + "]"); });
      } else if (o && typeof o === "object") {
        Object.entries(o).forEach(([k, v]) => { result += flatten(v, prefix ? prefix + "." + k : k); });
      } else {
        result += prefix + ": " + o + "\n";
      }
      return result;
    }
    return flatten(obj);
  } catch (e) { return jsonText; }
}

function parseXlsxToText(buffer) {
  try {
    const XLSX = require("xlsx");
    const wb = XLSX.read(buffer, { type: "buffer" });
    var result = "";
    wb.SheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(ws);
      result += "\n[Sheet: " + sheetName + "]\n" + parseCsvToText(csv) + "\n";
    });
    return result.trim();
  } catch (e) { return ""; }
}

async function parsePdfToText(buffer) {
  try {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (e) { return ""; }
}

/**
 * Extract readable text from any file buffer.
 * Supports: PDF, CSV, Excel (.xlsx/.xls), JSON, TXT, MD, and any plain text.
 */
async function extractTextFromFile(buffer, originalname, mimetype) {
  const ext = path.extname(originalname || "").toLowerCase();
  if (mimetype === "application/pdf" || ext === ".pdf") return await parsePdfToText(buffer);
  if (mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimetype === "application/vnd.ms-excel" || ext === ".xlsx" || ext === ".xls")
    return parseXlsxToText(buffer);
  const text = buffer.toString("utf-8");
  if (mimetype === "text/csv" || ext === ".csv") return parseCsvToText(text);
  if (mimetype === "application/json" || ext === ".json") return parseJsonToText(text);
  return text;
}

module.exports = { extractTextFromFile };
