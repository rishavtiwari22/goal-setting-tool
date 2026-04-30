/**
 * Google Apps Script for Zoe Interview Session Export
 *
 * SETUP:
 * 1. Open your Google Spreadsheet (the one you want to record to)
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click Deploy > New deployment
 * 5. Select type: "Web app"
 * 6. Set: Execute as = "Me", Who has access = "Anyone"
 * 7. Click Deploy, authorize when prompted
 * 8. Copy the Web app URL
 * 9. Paste it into your .env as VITE_GOOGLE_SHEETS_WEBHOOK_URL
 *
 * SPREADSHEET STRUCTURE (auto-created):
 * - "Index" sheet: one row per interview with email, score, links to sub-sheets
 * - "T_{sessionId}" sheets: full Q&A transcript
 * - "F_{sessionId}" sheets: evaluation feedback (score, summary, strengths, improvements)
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shortId = (data.sessionId || "unknown").substring(0, 8);

    // 1. Ensure Index sheet exists with headers
    var indexSheet = ss.getSheetByName("Index");
    if (!indexSheet) {
      indexSheet = ss.insertSheet("Index");
      indexSheet.appendRow([
        "Email", "Session ID", "Job Title", "Score", "Mode",
        "Duration (min)", "Start Time", "End Time", "Questions",
        "Transcript Sheet", "Feedback Sheet"
      ]);
      // Bold the header row
      indexSheet.getRange(1, 1, 1, 11).setFontWeight("bold");
    }

    // 2. Create transcript sheet
    var transcriptName = "T_" + shortId;
    var tSheet;
    try {
      tSheet = ss.insertSheet(transcriptName);
    } catch (err) {
      // Sheet might already exist
      tSheet = ss.getSheetByName(transcriptName);
      if (!tSheet) throw err;
    }

    tSheet.appendRow(["#", "Question", "Answer", "Timestamp"]);
    tSheet.getRange(1, 1, 1, 4).setFontWeight("bold");

    var transcript = data.transcript || [];
    for (var i = 0; i < transcript.length; i++) {
      tSheet.appendRow([
        i + 1,
        transcript[i].question || "",
        transcript[i].answer || "",
        transcript[i].timestamp || ""
      ]);
    }

    // Auto-resize columns
    tSheet.autoResizeColumns(1, 4);
    // Set answer column wider for readability
    tSheet.setColumnWidth(3, 500);

    // 3. Create feedback sheet
    var feedbackName = "F_" + shortId;
    var fSheet;
    try {
      fSheet = ss.insertSheet(feedbackName);
    } catch (err) {
      fSheet = ss.getSheetByName(feedbackName);
      if (!fSheet) throw err;
    }

    fSheet.appendRow(["Field", "Value"]);
    fSheet.getRange(1, 1, 1, 2).setFontWeight("bold");
    fSheet.appendRow(["Score", data.score || 0]);
    fSheet.appendRow(["Summary", data.summary || ""]);
    fSheet.appendRow(["Conclusion", data.conclusion || ""]);
    fSheet.appendRow(["", ""]);

    fSheet.appendRow(["Top Strengths", ""]);
    fSheet.getRange(fSheet.getLastRow(), 1, 1, 2).setFontWeight("bold");
    var strengths = data.topStrengths || [];
    for (var s = 0; s < strengths.length; s++) {
      fSheet.appendRow([strengths[s].name || "", strengths[s].description || ""]);
    }

    fSheet.appendRow(["", ""]);
    fSheet.appendRow(["Improvement Areas", ""]);
    fSheet.getRange(fSheet.getLastRow(), 1, 1, 2).setFontWeight("bold");
    var areas = data.improvementAreas || [];
    for (var a = 0; a < areas.length; a++) {
      fSheet.appendRow([areas[a].name || "", areas[a].description || ""]);
    }

    fSheet.autoResizeColumns(1, 2);
    fSheet.setColumnWidth(2, 600);

    // 4. Append row to Index with clickable links to transcript & feedback sheets
    var durationSec = data.duration || 0;
    var durationMin = Math.round(durationSec / 60);

    var spreadsheetUrl = ss.getUrl();
    var tSheetId = tSheet.getSheetId();
    var fSheetId = fSheet.getSheetId();

    // Append the data row first
    indexSheet.appendRow([
      data.email || "",
      data.sessionId || "",
      data.jobTitle || "",
      data.score || 0,
      data.mode || "practice",
      durationMin,
      data.startTime || "",
      data.endTime || "",
      data.totalQuestions || 0,
      "",  // placeholder for transcript link
      ""   // placeholder for feedback link
    ]);

    // Now set clickable HYPERLINK formulas in columns J and K
    var newRow = indexSheet.getLastRow();
    indexSheet.getRange(newRow, 10).setFormula(
      '=HYPERLINK("' + spreadsheetUrl + '#gid=' + tSheetId + '","' + transcriptName + '")'
    );
    indexSheet.getRange(newRow, 11).setFormula(
      '=HYPERLINK("' + spreadsheetUrl + '#gid=' + fSheetId + '","' + feedbackName + '")'
    );

    return ContentService.createTextOutput(
      JSON.stringify({ status: "ok", transcriptSheet: transcriptName, feedbackSheet: feedbackName })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Required for CORS — Apps Script sends GET for preflight
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok", message: "Zoe Interview Export endpoint is active" })
  ).setMimeType(ContentService.MimeType.JSON);
}
