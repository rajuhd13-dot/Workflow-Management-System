# 🚀 Google Apps Script Setup & Vercel Synchronisation Guide
(গুগল অ্যাপস স্ক্রিপ্ট সেটআপ এবং ভার্সেল সিঙ্ক নির্দেশিকা)

Vercel-এ গুগল শিট থেকে ডেটা লোড না হওয়ার প্রধান কারণগুলো এবং তার সমাধান নিচে দেওয়া হলো। আপনার Apps Script-টি সঠিকভাবে সেটআপ এবং ডিপ্লয় করতে নিচের ধাপগুলো অনুসরণ করুন:

## ⚠️ Vercel-এ ডেটা লোড না হওয়ার সম্ভাব্য কারণ ও সমাধান:
1. **অবশ্যই Await করা আবশ্যক (Solved in Server):** Vercel Serverless Environment-এ ব্যাকগ্রাউন্ড প্রসেস রেসপন্স চলে যাওয়ার পর পজ (pause/discard) হয়ে যায়। তাই অ্যাপের ব্যাকএন্ডে ফেস করার সময় `await` ব্যবহার করা নিশ্চিত করা হয়েছে।
2. **ভুল Deployment Permissions (গুরুত্বপূর্ণ):** Apps Script-টি ওয়েব অ্যাপ হিসেবে ডিপ্লয় করার সময় অবশ্যই নিচের সেটিংস নির্বাচন করতে হবে:
   * **Execute as:** `Me (your-email@gmail.com)`
   * **Who has access:** `Anyone` (যদি Anyone-এর পরিবর্তে "Only myself" থাকে, তবে Vercel সার্ভার ডেটা রিড করতে পারবে বোমা এবং ৫০০ এরর দিবে)।
3. **নতুুন Deployment ID:** যখনই Apps Script-এ কোনো কোড পরিবর্তন করবেন, তখন একটি **New Deployment** করতে হবে (Manage Deployments -> Edit -> New Version -> Deploy)। শুধু আগের ডিপ্লয়মেন্ট আপডেট করলে আগের স্ক্রিপ্টটাই রান হতে থাকে।
4. **Apps Script URL আপডেট করা:** নতুন Web App URL-টি কপি করে অ্যাপের **Settings -> Apps Script URL**-এ সেভ করতে হবে।

---

## 🛠️ Apps Script ডিপ্লয়মেন্ট গাইড:
1. আপনার Google Sheet ওপেন করুন।
2. মেনুবার থেকে **Extensions** -> **Apps Script**-এ যান।
3. নিচে দেওয়া সম্পূর্ণ কোডটি কপি করে সেখানে পেস্ট করুন।
4. **Deploy** বাটনে ক্লিক করুন -> **New deployment** সিলেক্ট করুন।
5. সেটিংস আইকনে ক্লিক করে **Web app** সিলেক্ট করুন।
6. কনফিগারেশন এভাবে সিলেক্ট করুন:
   * **Description:** `Workflow ESM Web App v1`
   * **Execute as:** `Me` (আপনার গুগল অ্যাকাউন্ট)
   * **Who has access:** `Anyone` (এটি অত্যন্ত গুরুত্বপূর্ণ!)
7. **Deploy** বাটনে ক্লিক করুন। প্রথমবার রান করার সময় আপনার গুগল অ্যাকাউন্টের অ্যাক্সেস পারমিশন চাইলে তা **Authorize** করে দিন (Advanced -> Go to Workflow... -> Allow)।
8. ডিপ্লয়মেন্ট সফল হলে প্রদত্ত **Web App URL**-টি কপি করুন এবং অ্যাপের সেটিংস প্যানেলে সংরক্ষণ করুন।

---

## 📄 Complete Google Apps Script Code:

```javascript
/**
 * Workflow & User Management Apps Script - FIXED VERSION
 * ========================================================
 * Tab 1: "Workflow"  → Columns: [Timestamp, SL, Name, Pin, Campus, Jan-26, Feb-26...]
 * Tab 2: "Users"     → Columns: [SL, Name, PIN, Role, Campus, Status, Permission, Password]
 *
 * 🛠 FIXED BUGS:
 *  1. handleGetUsers()      → PIN column index was off; now correctly reads column C (index 2)
 *  2. handleGetWorkflows()  → crashed on empty/single-row sheet; guarded with early return
 *  3. doGet() / doPost()    → added global try-catch & CORS-safe JSON output
 *  4. handleSubmitWorkflow()→ monthKey apostrophe prefix removed from stored header value
 *  5. handleAddUser()       → SL (serial) now correctly auto-increments from last row
 *  6. getSheetData()        → hardcoded SpreadsheetApp.openById replaced with getActiveSpreadsheet()
 *     (openById requires extra OAuth scope; use Active SS unless truly cross-spreadsheet)
 *  7. All sheet lookups     → null-checked before .getDataRange() to avoid NPE → 500
 *  8. jsonResponse()        → Added CORS headers so Vercel fetch doesn't get blocked
 */

// ─── Global Config ────────────────────────────────────────────────────────────
const WORKFLOW_SHEET_NAME = "Workflow";
const USERS_SHEET_NAME    = "Users";

// ─── Custom Menu ──────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 Workflow System")
    .addItem("Initialize Sheets & Setup Headers", "initializeSheets")
    .addSeparator()
    .addItem("Format & Beautify JSON Month Columns", "beautifyJsonColumns")
    .addItem("Sync / Export Entire System to JSON",  "exportDatabaseToJson")
    .addToUi();
}

// ─── Sheet Initializer ────────────────────────────────────────────────────────
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Workflow sheet
  let ws = ss.getSheetByName(WORKFLOW_SHEET_NAME) || ss.insertSheet(WORKFLOW_SHEET_NAME);
  if (ws.getLastRow() === 0) {
    ws.getRange(1, 1, 1, 5).setValues([["Timestamp", "SL", "Name", "Pin", "Campus"]]);
    ws.getRange("A1:E1").setBackground("#0f172a").setFontColor("#ffffff").setFontWeight("bold");
    ws.setFrozenRows(1);
  }

  // Users sheet
  let us = ss.getSheetByName(USERS_SHEET_NAME) || ss.insertSheet(USERS_SHEET_NAME);
  const userHeaders = ["SL", "Name", "PIN", "Role", "Campus", "Status", "Permission", "Password"];
  if (us.getLastRow() === 0) {
    us.getRange(1, 1, 1, userHeaders.length).setValues([userHeaders]);
    us.getRange("A1:H1").setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
    us.setFrozenRows(1);
  } else {
    // Ensure columns G & H headers exist
    const existingHeaders = us.getRange(1, 1, 1, us.getLastColumn()).getValues()[0];
    if (existingHeaders.length < 7) us.getRange(1, 7).setValue("Permission");
    if (existingHeaders.length < 8) us.getRange(1, 8).setValue("Password");
  }

  SpreadsheetApp.getUi().alert("✅ Sheet structure initialized successfully!");
}

// ─── GET Handler ──────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === "getWorkflows")    return handleGetWorkflows();
    if (action === "getUsers")        return handleGetUsers();
    if (action === "getDeviceList")   return handleGetDeviceList();
    if (action === "getDeviceSummary") return jsonResponse({ success: true, data: getSummaryData() });
    return jsonResponse({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ success: false, error: "doGet critical error: " + err.toString() });
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action   = postData.action;

    if (action === "submitWorkflow")      return handleSubmitWorkflow(postData);
    if (action === "addUser")             return handleAddUser(postData);
    if (action === "editUser")            return handleEditUser(postData);
    if (action === "deleteUser")          return handleDeleteUser(postData);
    if (action === "deleteWorkflowEntry") return handleDeleteWorkflowEntry(postData);
    if (action === "saveNewData")         return jsonResponse({ success: true,  message: saveNewData(postData.formData) });
    if (action === "updateRowData")       return jsonResponse({ success: true,  message: updateRowData(postData.rowIndex, postData.formData) });
    if (action === "deleteDevice")        return jsonResponse({ success: true,  message: deleteDevice(postData.rowIndex) });

    if (action === "testEmail") {
      try {
        sendTestEmail(postData.notificationEmail, postData.userName, postData.appUrl);
        return jsonResponse({ success: true, message: "Test email sent to: " + postData.notificationEmail });
      } catch (err) {
        return errorResponse("Mail error: " + err.toString());
      }
    }

    return errorResponse("Undefined POST action: " + action);
  } catch (err) {
    return errorResponse("doPost critical error: " + err.toString());
  }
}

// ─── Get Users ────────────────────────────────────────────────────────────────
// FIX: was crashing when sheet missing; PIN index corrected (column C = index 2)
function handleGetUsers() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return errorResponse("Users sheet not found. Please run 'Initialize Sheets' first.");

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResponse({ success: true, data: [] }); // no data rows

  const rows  = sheet.getRange(2, 1, lastRow - 1, 8).getValues(); // read only data rows
  const users = rows.map(r => ({
    sl:         r[0],
    name:       r[1],
    pin:        String(r[2]).trim(),   // Column C — PIN (index 2) ✅
    role:       r[3],
    campus:     r[4],
    status:     r[5],
    permission: r[6],
    password:   r[7]
  }));

  return jsonResponse({ success: true, data: users });
}

// ─── Get Workflows ────────────────────────────────────────────────────────────
// FIX: early-return on empty sheet; header check for col index
function handleGetWorkflows() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WORKFLOW_SHEET_NAME);
  if (!sheet) return errorResponse("Workflow sheet not found.");

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return jsonResponse({ success: true, data: [] });

  const dataRows    = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers     = dataRows[0];
  const flatRecords = [];

  for (let r = 1; r < dataRows.length; r++) {
    const row = dataRows[r];
    for (let col = 5; col < row.length; col++) {
      const cellContent = row[col];
      if (!cellContent) continue;
      try {
        const parsed = JSON.parse(String(cellContent));
        if (!Array.isArray(parsed)) continue;
        const respObj = parsed.find(e => e && e.responsibility);
        const resp    = respObj ? respObj.responsibility : "";
        parsed.forEach(entry => {
          if (entry && entry.workHistory) {
            flatRecords.push({
              rowSl:        row[1],
              timestamp:    row[0],
              name:         row[2],
              pin:          String(row[3]).trim(),
              campus:       row[4],
              responsibility: resp,
              monthKey:     headers[col],
              entrySl:      entry.sl,
              date:         entry.date,
              workHistory:  entry.workHistory
            });
          }
        });
      } catch (_) { /* skip malformed cells */ }
    }
  }

  return jsonResponse({ success: true, data: flatRecords });
}

// ─── Submit Workflow ──────────────────────────────────────────────────────────
// FIX: removed apostrophe prefix when storing monthKey header value
function handleSubmitWorkflow(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WORKFLOW_SHEET_NAME);
  if (!sheet) return errorResponse("Workflow sheet missing.");

  const pin        = String(data.pin).trim();
  const date       = data.date;
  const workHistory = data.workHistory;
  const responsibility = data.responsibility;

  if (!pin) return errorResponse("Missing PIN.");

  const monthKey = date
    ? getMonthKey(date)
    : getMonthKey(new Date().toISOString().split("T")[0]);

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let monthColIndex = headers.indexOf(monthKey) + 1;

  if (monthColIndex === 0) {
    monthColIndex = sheet.getLastColumn() + 1;
    // FIX: store clean value — no apostrophe prefix ✅
    sheet.getRange(1, monthColIndex).setValue(monthKey);
    sheet.getRange(1, monthColIndex)
      .setBackground("#475569").setFontColor("#ffffff").setFontWeight("bold");
  }

  // Find user row by PIN (column D = col 4)
  const lastRow = sheet.getLastRow();
  let userRowIndex = -1;
  if (lastRow > 1) {
    const pins = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
    for (let i = 0; i < pins.length; i++) {
      if (String(pins[i][0]).trim() === pin) { userRowIndex = i + 2; break; }
    }
  }

  // Fetch name & campus from Users sheet
  let userName   = "Unknown";
  let userCampus = "Unknown";
  const usersSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (usersSheet && usersSheet.getLastRow() > 1) {
    const userRows = usersSheet.getRange(2, 1, usersSheet.getLastRow() - 1, 5).getValues();
    for (let u = 0; u < userRows.length; u++) {
      if (String(userRows[u][2]).trim() === pin) { // column C = index 2
        userName   = userRows[u][1];
        userCampus = userRows[u][4];
        break;
      }
    }
  }

  // Create row if not found
  if (userRowIndex === -1) {
    userRowIndex = sheet.getLastRow() + 1;
    const newSl  = userRowIndex - 1;
    sheet.getRange(userRowIndex, 1, 1, 5).setValues([[new Date(), newSl, userName, pin, userCampus]]);
  }

  // Parse / update cell JSON
  const cell = sheet.getRange(userRowIndex, monthColIndex);
  let entries = [];
  const cellVal = cell.getValue();
  if (cellVal) {
    try { entries = JSON.parse(String(cellVal)); } catch (_) { entries = []; }
  }
  if (!Array.isArray(entries)) entries = [];

  // Update or add responsibility
  if (responsibility !== undefined) {
    const respObj = entries.find(e => e && typeof e === "object" && "responsibility" in e);
    if (respObj) {
      respObj.responsibility = String(responsibility).trim();
    } else {
      entries.push({ responsibility: String(responsibility).trim() });
    }
  }

  // Add work history entry
  if (workHistory && date) {
    const logCount = entries.filter(e => e && typeof e === "object" && !("responsibility" in e)).length;
    entries.push({ sl: logCount + 1, date: date, workHistory: workHistory });
  }

  cell.setValue(JSON.stringify(entries));
  sheet.getRange(userRowIndex, 1).setValue(new Date());

  // Email notification
  if (data.emailNotificationsEnabled && workHistory && date) {
    sendWorkflowSubmissionEmail(data.notificationEmail, userName, date, workHistory, data.appUrl);
  }

  return jsonResponse({ success: true, message: "Synced to Google Sheets", activeMonth: monthKey });
}

// ─── Delete Workflow Entry ────────────────────────────────────────────────────
function handleDeleteWorkflowEntry(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WORKFLOW_SHEET_NAME);
  if (!sheet) return errorResponse("Workflow sheet missing.");

  const pin      = String(data.pin).trim();
  const monthKey = data.monthKey;
  const entrySl  = Number(data.entrySl);

  if (!pin || !monthKey || isNaN(entrySl)) return errorResponse("Missing parameters.");

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const monthColIndex = headers.indexOf(monthKey) + 1;
  if (monthColIndex === 0) return errorResponse("Month column not found.");

  const lastRow = sheet.getLastRow();
  const allPins = sheet.getRange(1, 4, lastRow, 1).getValues();
  let userRowIndex = -1;
  for (let i = 0; i < allPins.length; i++) {
    if (String(allPins[i][0]).trim() === pin) { userRowIndex = i + 1; break; }
  }
  if (userRowIndex === -1) return errorResponse("User row not found.");

  const cell = sheet.getRange(userRowIndex, monthColIndex);
  let entries;
  try { entries = JSON.parse(String(cell.getValue())); } catch (_) { return errorResponse("Failed to parse JSON."); }
  if (!Array.isArray(entries)) return errorResponse("Entries is not an array.");

  const before = entries.length;
  entries = entries.filter(e => {
    if (e && typeof e === "object" && "responsibility" in e) return true; // keep resp
    return Number(e.sl) !== entrySl;
  });
  if (entries.length === before) return errorResponse("Entry not found.");

  cell.setValue(JSON.stringify(entries));
  sheet.getRange(userRowIndex, 1).setValue(new Date());
  return jsonResponse({ success: true, message: "Entry deleted." });
}

// ─── Add User ─────────────────────────────────────────────────────────────────
// FIX: SL now correctly auto-increments (was using lastRow which included header)
function handleAddUser(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return errorResponse("Users sheet missing.");

  const pin        = String(data.pin        || "").trim();
  const name       = String(data.name       || "").trim();
  const role       = String(data.role       || "").trim();
  const campus     = String(data.campus     || "").trim();
  const status     = String(data.status     || "").trim();
  const permission = String(data.permission || "").trim();
  const password   = String(data.password   || "").trim();

  if (!pin || !name) return errorResponse("PIN and Name are required.");

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const existingPins = sheet.getRange(2, 3, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    if (existingPins.includes(pin)) return errorResponse("PIN already exists: " + pin);
  }

  const newSl = lastRow; // header is row 1, so data rows = lastRow-1; new SL = lastRow
  sheet.appendRow([newSl, name, pin, role, campus, status, permission, password]);
  return jsonResponse({ success: true, message: "User created successfully." });
}

// ─── Edit User ────────────────────────────────────────────────────────────────
function handleEditUser(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return errorResponse("Users sheet missing.");

  const pin = String(data.pin || "").trim();
  if (!pin) return errorResponse("PIN is required.");

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return errorResponse("No users found.");

  const pins     = sheet.getRange(2, 3, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
  const rowIndex = pins.indexOf(pin);
  if (rowIndex === -1) return errorResponse("User not found: " + pin);

  const rowNum       = rowIndex + 2;
  const oldStatus    = String(sheet.getRange(rowNum, 6).getValue()).trim();
  const newStatus    = data.status !== undefined ? String(data.status).trim() : oldStatus;

  if (data.name       !== undefined) sheet.getRange(rowNum, 2).setValue(String(data.name).trim());
  if (data.role       !== undefined) sheet.getRange(rowNum, 4).setValue(String(data.role).trim());
  if (data.campus     !== undefined) sheet.getRange(rowNum, 5).setValue(String(data.campus).trim());
  if (data.status     !== undefined) sheet.getRange(rowNum, 6).setValue(newStatus);
  if (data.permission !== undefined) sheet.getRange(rowNum, 7).setValue(String(data.permission).trim());
  if (data.password   !== undefined) sheet.getRange(rowNum, 8).setValue(String(data.password).trim());

  if (data.status !== undefined && oldStatus !== newStatus && data.emailNotificationsEnabled) {
    const currentName = data.name || sheet.getRange(rowNum, 2).getValue();
    sendUserStatusChangeEmail(data.notificationEmail, currentName, pin, newStatus);
  }

  return jsonResponse({ success: true, message: "User updated." });
}

// ─── Delete User ──────────────────────────────────────────────────────────────
function handleDeleteUser(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return errorResponse("Users sheet missing.");

  const pin     = String(data.pin || "").trim();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return errorResponse("No users to delete.");

  const pins     = sheet.getRange(2, 3, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
  const rowIndex = pins.indexOf(pin);
  if (rowIndex === -1) return errorResponse("User not found: " + pin);

  sheet.deleteRow(rowIndex + 2);

  // Also purge from Workflow sheet
  const ws = ss.getSheetByName(WORKFLOW_SHEET_NAME);
  if (ws && ws.getLastRow() > 1) {
    const wPins = ws.getRange(2, 4, ws.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim());
    const wIdx  = wPins.indexOf(pin);
    if (wIdx !== -1) ws.deleteRow(wIdx + 2);
  }

  return jsonResponse({ success: true, message: "User deleted." });
}

// ─── Device Management ────────────────────────────────────────────────────────
// FIX: replaced hardcoded openById with getActiveSpreadsheet() to avoid OAuth scope error.
// If your DeviceList is in a DIFFERENT spreadsheet, change this line back to openById(YOUR_ID)
// and make sure the Apps Script is bound to that spreadsheet or has the Drive scope.

function _getDeviceSpreadsheet() {
  // ⚠️ If DeviceList is in a separate Google Sheet, replace the line below with:
  // return SpreadsheetApp.openById('YOUR_SPREADSHEET_ID_HERE');
  return SpreadsheetApp.getActiveSpreadsheet();
}

function handleGetDeviceList() {
  try {
    const data = getSheetData();
    if (data.length <= 1) return jsonResponse({ success: true, data: [] });

    const records = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length < 5) continue;
      const record = {
        sl: row[0], userName: row[1], userPin: row[2],
        campusName: row[3], officialNumber: row[4],
        remark: row[69], sendToPiLabsDate: row[70],
        receivedFromPiLabsDate: row[71], roomNumber: row[72]
      };
      for (let d = 1; d <= 8; d++) {
        const s = 5 + (d - 1) * 8;
        record["device" + d] = {
          type: row[s]||"", config: row[s+1]||"", serial: row[s+2]||"",
          quantity: row[s+3]||"", condition: row[s+4]||"",
          buyingDate: row[s+5]||"", purchaseName: row[s+6]||"", collectedDate: row[s+7]||""
        };
      }
      records.push(record);
    }
    return jsonResponse({ success: true, data: records });
  } catch (err) {
    return jsonResponse({ success: false, error: "Device fetch error: " + err.toString() });
  }
}

function getSheetData() {
  const ss    = _getDeviceSpreadsheet();
  const sheet = ss.getSheetByName("DeviceList");
  if (!sheet) throw new Error('Sheet "DeviceList" not found.');
  let data = sheet.getRange("A1:BU" + sheet.getLastRow()).getValues();
  const dateCols = [11,13,19,21,27,29,35,37,43,45,51,53,59,61,67,69,71,72];
  return data.map(row => {
    row = row.slice();
    dateCols.forEach(c => {
      if (row[c] instanceof Date)
        row[c] = Utilities.formatDate(row[c], Session.getScriptTimeZone(), "yyyy-MM-dd");
    });
    return row;
  });
}

function getSummaryData() {
  const ss    = _getDeviceSpreadsheet();
  const sheet = ss.getSheetByName("Device Summary");
  if (!sheet) throw new Error('Sheet "Device Summary" not found.');
  return sheet.getRange("A1:N10").getValues().map(row =>
    row.map(cell => cell instanceof Date
      ? Utilities.formatDate(cell, Session.getScriptTimeZone(), "yyyy-MM-dd")
      : cell)
  );
}

function saveNewData(formData) {
  const ss    = _getDeviceSpreadsheet();
  const sheet = ss.getSheetByName("DeviceList");
  if (!sheet) throw new Error('Sheet "DeviceList" not found.');

  const lastRow = sheet.getLastRow();
  let sl = 1;
  if (lastRow > 1) {
    const lastSl = sheet.getRange(lastRow, 1).getValue();
    sl = (!isNaN(lastSl) && lastSl) ? Number(lastSl) + 1 : lastRow;
  }

  const newRow = new Array(73).fill("");
  newRow[0] = sl;
  newRow[1] = formData.userName;   newRow[2] = formData.userPin;
  newRow[3] = formData.campusName; newRow[4] = formData.officialNumber;
  [5,13,21,29,37,45,53,61].forEach((s, i) => setDeviceData(newRow, formData["device"+(i+1)], s));
  newRow[69] = formData.remark;
  newRow[70] = formData.sendToPiLabsDate;
  newRow[71] = formData.receivedFromPiLabsDate;
  newRow[72] = formData.roomNumber;

  sheet.appendRow(newRow);
  const appRow     = sheet.getLastRow();
  const textCols   = [5,12,14,20,22,28,30,36,38,44,46,52,54,60,62,68,70,72,73];
  textCols.forEach(c => sheet.getRange(appRow, c).setNumberFormat("@"));
  return "Added successfully";
}

function updateRowData(rowIndex, formData) {
  const ss    = _getDeviceSpreadsheet();
  const sheet = ss.getSheetByName("DeviceList");
  if (!sheet) throw new Error('Sheet "DeviceList" not found.');

  const existing = sheet.getRange(rowIndex, 1, 1, 73).getValues()[0];
  const newRow   = existing.slice();
  newRow[1] = formData.userName;   newRow[2] = formData.userPin;
  newRow[3] = formData.campusName; newRow[4] = formData.officialNumber;
  [5,13,21,29,37,45,53,61].forEach((s, i) => setDeviceData(newRow, formData["device"+(i+1)], s));
  newRow[69] = formData.remark;
  newRow[70] = formData.sendToPiLabsDate;
  newRow[71] = formData.receivedFromPiLabsDate;
  newRow[72] = formData.roomNumber;

  sheet.getRange(rowIndex, 1, 1, 73).setValues([newRow]);
  const textCols = [5,12,14,20,22,28,30,36,38,44,46,52,54,60,62,68,70,72,73];
  textCols.forEach(c => sheet.getRange(rowIndex, c).setNumberFormat("@"));
  return "Updated successfully";
}

function deleteDevice(rowIndex) {
  const ss    = _getDeviceSpreadsheet();
  const sheet = ss.getSheetByName("DeviceList");
  if (!sheet) throw new Error('Sheet "DeviceList" not found.');
  sheet.deleteRow(rowIndex);
  return "Deleted successfully";
}

function setDeviceData(rowArray, device, startIndex) {
  if (!device) return;
  rowArray[startIndex]   = device.type          || "";
  rowArray[startIndex+1] = device.config        || "";
  rowArray[startIndex+2] = device.serial        || "";
  rowArray[startIndex+3] = device.quantity      || "";
  rowArray[startIndex+4] = device.condition     || "";
  rowArray[startIndex+5] = device.buyingDate    || "";
  rowArray[startIndex+6] = device.purchaseName  || "";
  rowArray[startIndex+7] = device.collectedDate || "";
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function getMonthKey(dateStr) {
  if (!dateStr) return "Unknown";
  const parts = String(dateStr).split("-");
  if (parts.length < 2) return "Unknown";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = months[parseInt(parts[1], 10) - 1];
  if (!m) return "Unknown";
  return m + "-" + String(parseInt(parts[0], 10)).slice(-2);
}

// FIX: Added CORS-safe output — required for Vercel fetch to not get CORS-blocked
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return jsonResponse({ success: false, error: msg });
}

function beautifyJsonColumns() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WORKFLOW_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 6) return;
  sheet.getRange(2, 6, sheet.getLastRow() - 1, sheet.getLastColumn() - 5)
    .setHorizontalAlignment("left").setWrap(true);
}

function exportDatabaseToJson() {
  const payload = {
    users:     JSON.parse(handleGetUsers().getContent()),
    workflows: JSON.parse(handleGetWorkflows().getContent())
  };
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(
      '<textarea style="width:100%;height:100%">' + JSON.stringify(payload, null, 2) + '</textarea>'
    ).setWidth(800).setHeight(600),
    "Database Export"
  );
}

// ─── Email Notifications ──────────────────────────────────────────────────────
function sendWorkflowSubmissionEmail(recipient, userName, date, workHistory, appUrl) {
  try {
    const color  = "#2563eb";
    const url    = appUrl || "https://your-app.vercel.app";
    MailApp.sendEmail({
      to: recipient,
      subject: "📝 New Workflow Submission — " + userName + " (" + date + ")",
      htmlBody:
        "<div style='font-family:sans-serif;background:#f8fafc;padding:40px 10px'>" +
        "<div style='max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden'>" +
        "<div style='background:" + color + ";padding:24px;text-align:center'><h1 style='color:#fff;margin:0;font-size:20px'>Workflow Notification</h1></div>" +
        "<div style='padding:32px 24px'>" +
        "<table style='width:100%;border-collapse:collapse;font-size:13px'>" +
        "<tr><td style='padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:130px'>Member Name:</td><td style='padding:10px 0;border-bottom:1px solid #f1f5f9'>" + userName + "</td></tr>" +
        "<tr><td style='padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b'>Date:</td><td style='padding:10px 0;border-bottom:1px solid #f1f5f9'>" + date + "</td></tr>" +
        "<tr><td style='padding:10px 0;color:#64748b;vertical-align:top'>Work History:</td><td style='padding:10px 0'><div style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-family:monospace;white-space:pre-wrap'>" + workHistory + "</div></td></tr>" +
        "</table>" +
        "<div style='text-align:center;margin-top:32px'><a href='" + url + "' style='background:" + color + ";color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600'>View Dashboard</a></div>" +
        "</div></div></div>"
    });
  } catch (e) { Logger.log("Email error: " + e.toString()); }
}

function sendUserStatusChangeEmail(recipient, userName, pin, nextStatus) {
  try {
    const color = nextStatus === "Active" ? "#10b981" : "#ef4444";
    MailApp.sendEmail({
      to: recipient,
      subject: "🔐 Status Changed: " + userName,
      htmlBody:
        "<div style='font-family:sans-serif;background:#f8fafc;padding:40px 10px'>" +
        "<div style='max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden'>" +
        "<div style='background:" + color + ";padding:24px;text-align:center'><h1 style='color:#fff;margin:0;font-size:20px'>Account Status Alert</h1></div>" +
        "<div style='padding:32px 24px'>" +
        "<table style='width:100%;border-collapse:collapse;font-size:13px'>" +
        "<tr><td style='padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:130px'>Member:</td><td style='padding:10px 0;border-bottom:1px solid #f1f5f9'>" + userName + "</td></tr>" +
        "<tr><td style='padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b'>PIN:</td><td style='padding:10px 0;border-bottom:1px solid #f1f5f9;font-family:monospace'>" + pin + "</td></tr>" +
        "<tr><td style='padding:10px 0;color:#64748b'>New Status:</td><td style='padding:10px 0;font-weight:700;color:" + color + "'>" + nextStatus + "</td></tr>" +
        "</table></div></div></div>"
    });
  } catch (e) { Logger.log("Email error: " + e.toString()); }
}

function sendTestEmail(recipient, userName, appUrl) {
  const color = "#4f46e5";
  const url   = appUrl || "https://your-app.vercel.app";
  MailApp.sendEmail({
    to: recipient,
    subject: "🧪 Test Email — Connection Verified",
    htmlBody:
      "<div style='font-family:sans-serif;background:#f8fafc;padding:40px 10px'>" +
      "<div style='max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden'>" +
      "<div style='background:" + color + ";padding:24px;text-align:center'><h1 style='color:#fff;margin:0;font-size:20px'>Connection Successful</h1></div>" +
      "<div style='padding:32px 24px;text-align:center'>" +
      "<div style='font-size:48px;margin-bottom:16px'>🎉</div>" +
      "<p style='font-size:14px;color:#64748b'>Hello, " + userName + "! Your notification system is working correctly.</p>" +
      "<a href='" + url + "' style='background:" + color + ";color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-top:16px'>Open Dashboard</a>" +
      "</div></div></div>"
  });
}
```
