# 🚀 Google Apps Script Setup & Vercel Synchronisation Guide
(গুগল অ্যাপস স্ক্রিপ্ট সেটআপ এবং ভার্সেল সিঙ্ক নির্দেশিকা)

Vercel-এ গুগল শিট থেকে ডেটা লোড না হওয়ার প্রধান কারণগুলো এবং তার সমাধান নিচে দেওয়া হলো। আপনার Apps Script-টি সঠিকভাবে সেটআপ এবং ডিপ্লয় করতে নিচের ধাপগুলো অনুসরণ করুন:

## ⚠️ Vercel-এ ডেটা লোড না হওয়ার সম্ভাব্য কারণ ও সমাধান:
1. **অবশ্যই Await করা আবশ্যক (Solved in Server):** Vercel Serverless Environment-এ ব্যাকগ্রাউন্ড প্রসেস রেসপন্স চলে যাওয়ার পর পজ (pause/discard) হয়ে যায়। তাই অ্যাপের ব্যাকএন্ডে ফেস করার সময় `await` ব্যবহার করা নিশ্চিত করা হয়েছে।
2. **ভুল Deployment Permissions (গুরুত্বপূর্ণ):** Apps Script-টি ওয়েব অ্যাপ হিসেবে ডিপ্লয় করার সময় অবশ্যই নিচের সেটিংস নির্বাচন করতে হবে:
   * **Execute as:** `Me (your-email@gmail.com)`
   * **Who has access:** `Anyone` (যদি Anyone-এর পরিবর্তে "Only myself" থাকে, তবে Vercel সার্ভার ডেটা রিড করতে পারবে না এবং ৫০০ এরর দিবে)।
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
 * Workflow & User Management Apps Script
 * Tab 1 Name: "Workflow" - Columns: [Timestamp, SL, Name, Pin, Campus, Jan-26, Feb-26...]
 * Tab 2 Name: "Users" - Columns: [SL, Name, PIN, Role, Campus, Status, Permission, Password]
 * Date: 2024-06-22
 */

// Establish global configuration parameters
const WORKFLOW_SHEET_NAME = "Workflow";
const USERS_SHEET_NAME = "Users";


/**
 * Creates a Custom Menu in Google Sheets on Open
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🚀 Workflow System")
    .addItem("Initialize Sheets & Setup Headers", "initializeSheets")
    .addSeparator()
    .addItem("Format & Beautify JSON Month Columns", "beautifyJsonColumns")
    .addItem("Sync / Export Entire System to JSON", "exportDatabaseToJson")
    .addToUi();
}

/**
 * Initializer script to setup the required sheets & headers
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Workers/Workflow spreadsheet tab
  let workflowSheet = ss.getSheetByName(WORKFLOW_SHEET_NAME);
  if (!workflowSheet) {
    workflowSheet = ss.insertSheet(WORKFLOW_SHEET_NAME);
  }
  
  // Base headers for Workflow sheet
  const workflowHeaders = ["Timestamp", "SL", "Name", "Pin", "Campus"];
  if (workflowSheet.getLastRow() === 0) {
    workflowSheet.getRange(1, 1, 1, workflowHeaders.length).setValues([workflowHeaders]);
    workflowSheet.getRange("A1:E1").setBackground("#0f172a").setFontColor("#ffffff").setFontWeight("bold");
    workflowSheet.setFrozenRows(1);
  }

  // 2. Setup Users Directory spreadsheet tab
  let usersSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(USERS_SHEET_NAME);
  }
  
  const userHeaders = ["SL", "Name", "PIN", "Role", "Campus", "Status", "Permission", "Password"];
  if (usersSheet.getLastRow() === 0) {
    usersSheet.getRange(1, 1, 1, userHeaders.length).setValues([userHeaders]);
    usersSheet.getRange("A1:H1").setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
    usersSheet.setFrozenRows(1);
  } else {
    // If headers exist, ensure column H is Password if it's missing
    const currentHeaders = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0];
    if (currentHeaders.length < 8) {
      usersSheet.getRange(1, 7).setValue("Permission");
      usersSheet.getRange(1, 8).setValue("Password");
      usersSheet.getRange("G1:H1").setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
    }
  }
  
  SpreadsheetApp.getUi().alert("Sheet structure initialized successfully!");
}

/**
 * API Endpoint: Handles RESTful doGet requests
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === "getWorkflows") {
      return handleGetWorkflows();
    } else if (action === "getUsers") {
      return handleGetUsers();
    } else if (action === "getDeviceList") {
      return handleGetDeviceList();
    } else if (action === "getDeviceSummary") {
      return jsonResponse({ success: true, data: getSummaryData() });
    }
    
    return jsonResponse({
      success: false,
      error: "Invalid action routing parameter: " + action
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Apps Script GET Critical Error: " + err.toString()
    });
  }
}

/**
 * API Endpoint: Handles RESTful doPost requests
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    if (action === "submitWorkflow") {
      return handleSubmitWorkflow(postData);
    } else if (action === "testEmail") {
      try {
        sendTestEmail(postData.notificationEmail, postData.userName, postData.appUrl);
        return jsonResponse({ success: true, message: "Test notification mailed to: " + postData.notificationEmail });
      } catch (err) {
        return errorResponse("Mailing exception: " + err.toString());
      }
    } else if (action === "addUser") {
      return handleAddUser(postData);
    } else if (action === "editUser") {
      return handleEditUser(postData);
    } else if (action === "deleteUser") {
      return handleDeleteUser(postData);
    } else if (action === "saveNewData") {
      return jsonResponse({ success: true, message: saveNewData(postData.formData) });
    } else if (action === "updateRowData") {
      return jsonResponse({ success: true, message: updateRowData(postData.rowIndex, postData.formData) });
    } else if (action === "deleteDevice") {
      return jsonResponse({ success: true, message: deleteDevice(postData.rowIndex) });
    } else if (action === "deleteWorkflowEntry") {
      return handleDeleteWorkflowEntry(postData);
    }

    return errorResponse("Undefined POST action: " + action);

  } catch (err) {
    return errorResponse("Apps Script Error: " + err.toString());
  }
}

/**
 * Wrapper for getting device list in JSON format
 */
function handleGetDeviceList() {
  try {
    const data = getSheetData();
    if (data.length <= 1) return jsonResponse({ success: true, data: [] });
    
    const headers = data[0];
    const records = [];
    
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      if (!row || row.length < 5) continue; 

      var record = {
        sl: row[0],
        userName: row[1],
        userPin: row[2],
        campusName: row[3],
        officialNumber: row[4],
        remark: row[69],
        sendToPiLabsDate: row[70],
        receivedFromPiLabsDate: row[71],
        roomNumber: row[72]
      };
      
      // Map devices
      for (var d = 1; d <= 8; d++) {
        var start = 5 + (d - 1) * 8;
        record["device" + d] = {
          type: row[start] || "",
          config: row[start+1] || "",
          serial: row[start+2] || "",
          quantity: row[start+3] || "",
          condition: row[start+4] || "",
          buyingDate: row[start+5] || "",
          purchaseName: row[start+6] || "",
          collectedDate: row[start+7] || ""
        };
      }
      records.push(record);
    }
    
    return jsonResponse({ success: true, data: records });
  } catch (err) {
    return jsonResponse({ success: false, error: "Device fetch failure: " + err.toString() });
  }
}

/**
 * Logic to save/modify work history entry inside targeted month-columns
 */
function handleSubmitWorkflow(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WORKFLOW_SHEET_NAME);
  if (!sheet) return errorResponse("Workflow sheet missing.");

  const pin = String(data.pin).trim();
  const date = data.date; // YYYY-MM-DD
  const workHistory = data.workHistory;
  const responsibility = data.responsibility;

  if (!pin) return errorResponse("Missing PIN");

  const monthKey = date ? getMonthKey(date) : getMonthKey(new Date().toISOString().split("T")[0]);
  
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  let monthColIndex = headers.indexOf(monthKey) + 1;
  
  if (monthColIndex === 0) {
    monthColIndex = sheet.getLastColumn() + 1;
    sheet.getRange(1, monthColIndex).setValue("'" + monthKey);
    sheet.getRange(1, monthColIndex).setBackground("#475569").setFontColor("#ffffff").setFontWeight("bold");
  }

  // Find user row in Workflow sheet (PIN is column D / index 3)
  const lastRow = sheet.getLastRow();
  let userRowIndex = -1;
  if (lastRow > 1) {
    const pinsInSheet = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
    for (let i = 0; i < pinsInSheet.length; i++) {
      if (String(pinsInSheet[i][0]).trim() === pin) {
        userRowIndex = i + 2;
        break;
      }
    }
  }

  // Meta data from Users sheet
  let userName = "Unknown";
  let userCampus = "Unknown";
  const usersSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (usersSheet) {
    const userRows = usersSheet.getDataRange().getValues();
    for (let u = 1; u < userRows.length; u++) {
      if (String(userRows[u][2]).trim() === pin) { // PIN matches Column C
        userName = userRows[u][1];
        userCampus = userRows[u][4];
        break;
      }
    }
  }

  if (userRowIndex === -1) {
    userRowIndex = sheet.getLastRow() + 1;
    sheet.getRange(userRowIndex, 1, 1, 5).setValues([[new Date(), userRowIndex - 1, userName, pin, userCampus]]);
  }

  let entriesList = [];
  const cell = sheet.getRange(userRowIndex, monthColIndex);
  const currentCellVal = cell.getValue();
  if (currentCellVal) {
    try {
      entriesList = JSON.parse(currentCellVal);
    } catch (e) {
      entriesList = [];
    }
  }

  if (responsibility !== undefined) {
    let respObj = entriesList.find(e => e && typeof e === "object" && "responsibility" in e);
    if (respObj) {
      respObj.responsibility = String(responsibility).trim();
    } else {
      entriesList.push({ responsibility: String(responsibility).trim() });
    }
  }

  if (workHistory && date) {
    const logEntriesLength = entriesList.filter(e => e && typeof e === "object" && !("responsibility" in e)).length;
    entriesList.push({
      sl: logEntriesLength + 1,
      date: date,
      workHistory: workHistory
    });
  }

  cell.setValue(JSON.stringify(entriesList));
  sheet.getRange(userRowIndex, 1).setValue(new Date()); 

  if (data.emailNotificationsEnabled && workHistory && date) {
    sendWorkflowSubmissionEmail(data.notificationEmail, userName, date, workHistory, data.appUrl);
  }

  return jsonResponse({
    success: true,
    message: "Synced to Google Sheets",
    activeMonth: monthKey
  });
}

/**
 * Logic to delete work history entry inside targeted month-columns
 */
function handleDeleteWorkflowEntry(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WORKFLOW_SHEET_NAME);
  if (!sheet) return errorResponse("Workflow sheet missing.");

  const pin = String(data.pin).trim();
  const monthKey = data.monthKey;
  const entrySl = Number(data.entrySl);

  if (!pin || !monthKey || isNaN(entrySl)) return errorResponse("Missing required parameters for deletion.");

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const monthColIndex = headers.indexOf(monthKey) + 1;
  if (monthColIndex === 0) return errorResponse("Month column not found.");

  const lastRow = sheet.getLastRow();
  let userRowIndex = -1;
  const pinsInSheet = sheet.getRange(1, 4, lastRow, 1).getValues();
  for (let i = 0; i < pinsInSheet.length; i++) {
    if (String(pinsInSheet[i][0]).trim() === pin) {
      userRowIndex = i + 1;
      break;
    }
  }

  if (userRowIndex === -1) return errorResponse("User row not found.");

  const cell = sheet.getRange(userRowIndex, monthColIndex);
  let entriesList = [];
  try {
    entriesList = JSON.parse(cell.getValue());
  } catch (e) {
    return errorResponse("Failed to parse entries JSON.");
  }

  if (!Array.isArray(entriesList)) return errorResponse("Entries is not an array.");

  const initialCount = entriesList.length;
  entriesList = entriesList.filter(e => {
    if (e && typeof e === "object" && "responsibility" in e) return true;
    return Number(e.sl) !== entrySl;
  });

  if (entriesList.length === initialCount) return errorResponse("Entry not found in JSON.");

  cell.setValue(JSON.stringify(entriesList));
  sheet.getRange(userRowIndex, 1).setValue(new Date());

  return jsonResponse({ success: true, message: "Entry deleted from Google Sheets." });
}

/**
 * Sync logic for adding a user
 */
function handleAddUser(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return errorResponse("Users sheet missing.");

  const pin = String(data.pin).trim();
  const name = String(data.name).trim();
  const role = String(data.role).trim();
  const campus = String(data.campus).trim();
  const status = String(data.status).trim();
  const permission = String(data.permission || "").trim();
  const password = String(data.password || "").trim();

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const pins = sheet.getRange(2, 3, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    if (pins.indexOf(pin) !== -1) return errorResponse("PIN already exists.");
  }

  sheet.appendRow([lastRow, name, pin, role, campus, status, permission, password]);
  return jsonResponse({ success: true, message: "User created in Sheets." });
}

/**
 * Sync logic for editing a user profile
 */
function handleEditUser(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return errorResponse("Users sheet missing.");

  const pin = String(data.pin).trim();
  const name = data.name;
  const role = data.role;
  const campus = data.campus;
  const status = data.status;
  const password = data.password;
  const permission = data.permission;

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return errorResponse("No users found.");

  const pins = sheet.getRange(2, 3, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
  const rowIndex = pins.indexOf(pin);

  if (rowIndex === -1) return errorResponse("User not found: " + pin);

  const rowNum = rowIndex + 2;

  const currentStatusValStr = sheet.getRange(rowNum, 6).getValue();
  const oldStatusVal = String(currentStatusValStr).trim();
  const newStatusVal = status !== undefined ? String(status).trim() : oldStatusVal;

  // Update fields if provided
  if (name !== undefined) sheet.getRange(rowNum, 2).setValue(String(name).trim());
  if (role !== undefined) sheet.getRange(rowNum, 4).setValue(String(role).trim());
  if (campus !== undefined) sheet.getRange(rowNum, 5).setValue(String(campus).trim());
  if (status !== undefined) sheet.getRange(rowNum, 6).setValue(String(status).trim());
  if (permission !== undefined) sheet.getRange(rowNum, 7).setValue(String(permission).trim());
  if (password !== undefined) sheet.getRange(rowNum, 8).setValue(String(password).trim());

  if (status !== undefined && oldStatusVal !== newStatusVal && data.emailNotificationsEnabled) {
    sendUserStatusChangeEmail(data.notificationEmail, name || sheet.getRange(rowNum, 2).getValue(), pin, newStatusVal);
  }

  return jsonResponse({ success: true, message: "User updated in Sheets." });
}

/**
 * Sync logic for deleting a user profile
 */
function handleDeleteUser(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return errorResponse("Users sheet missing.");

  const pin = String(data.pin).trim();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return errorResponse("No users to delete.");

  const pins = sheet.getRange(2, 3, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
  const rowIndex = pins.indexOf(pin);

  if (rowIndex === -1) return errorResponse("User not found: " + pin);

  sheet.deleteRow(rowIndex + 2);
  
  // Also delete from Workflow sheet if exists
  const workflowSheet = ss.getSheetByName(WORKFLOW_SHEET_NAME);
  if (workflowSheet) {
    const wLastRow = workflowSheet.getLastRow();
    if (wLastRow > 1) {
      const wPins = workflowSheet.getRange(2, 4, wLastRow - 1, 1).getValues().map(r => String(r[0]).trim());
      const wRowIndex = wPins.indexOf(pin);
      if (wRowIndex !== -1) {
        workflowSheet.deleteRow(wRowIndex + 2);
      }
    }
  }

  return jsonResponse({ success: true, message: "User purged from Sheets." });
}

/**
 * Fetch users
 */
function handleGetUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return errorResponse("Users sheet missing.");

  const rows = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < rows.length; i++) {
    users.push({
      sl: rows[i][0],
      name: rows[i][1],
      pin: rows[i][2],
      role: rows[i][3],
      campus: rows[i][4],
      status: rows[i][5],
      permission: rows[i][6],
      password: rows[i][7]
    });
  }
  return jsonResponse({ success: true, data: users });
}

/**
 * Fetch workflows
 */
function handleGetWorkflows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WORKFLOW_SHEET_NAME);
  if (!sheet) return errorResponse("Workflow sheet missing.");

  const dataRows = sheet.getDataRange().getValues();
  if (dataRows.length <= 1) return jsonResponse({ success: true, data: [] });

  const headers = dataRows[0];
  const flatRecords = [];

  for (let r = 1; r < dataRows.length; r++) {
    const row = dataRows[r];
    for (let col = 5; col < row.length; col++) {
      const cellContent = row[col];
      if (cellContent) {
        try {
          const parsed = JSON.parse(cellContent);
          if (Array.isArray(parsed)) {
            const respObj = parsed.find(e => e && e.responsibility);
            const resp = respObj ? respObj.responsibility : "";
            parsed.forEach(entry => {
              if (entry && entry.workHistory) {
                flatRecords.push({
                  rowSl: row[1],
                  timestamp: row[0],
                  name: row[2],
                  pin: row[3],
                  campus: row[4],
                  responsibility: resp,
                  monthKey: headers[col],
                  entrySl: entry.sl,
                  date: entry.date,
                  workHistory: entry.workHistory
                });
              }
            });
          }
        } catch (e) {}
      }
    }
  }
  return jsonResponse({ success: true, data: flatRecords });
}

function getMonthKey(dateStr) {
  if (!dateStr) return "Unknown";
  const parts = String(dateStr).split("-");
  if (parts.length < 2) return "Unknown";
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = monthsList[month];
  if (!m) return "Unknown";
  const y = String(year).slice(-2);
  return m + "-" + y;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return jsonResponse({ success: false, error: msg });
}

function beautifyJsonColumns() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WORKFLOW_SHEET_NAME);
  if (!sheet) return;
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  if (lastCol < 6 || lastRow < 2) return;
  sheet.getRange(2, 6, lastRow - 1, lastCol - 5).setHorizontalAlignment("left").setWrap(true);
}

function exportDatabaseToJson() {
  const resWorkflows = handleGetWorkflows();
  const resUsers = handleGetUsers();
  const payload = {
    users: JSON.parse(resUsers.getContent()),
    workflows: JSON.parse(resWorkflows.getContent())
  };
  const html = HtmlService.createHtmlOutput('<textarea style="width:100%;height:100%">' + JSON.stringify(payload, null, 2) + '</textarea>').setWidth(800).setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, "Database Export");
}

/**
 * ================= DEVICE MANAGEMENT LOGIC =================
 */

function getSheetData() {
  var ss = SpreadsheetApp.openById('1QgLbwKanHB329n8OPb3u8T0CCkPhAzkBMT30vunEOFA');
  var sheet = ss.getSheetByName('DeviceList');
  if (!sheet) {
    throw new Error('Sheet "DeviceList" not found.');
  }
  var data = sheet.getRange('A1:BU' + sheet.getLastRow()).getValues();
  // Format dates to text
  data = data.map(function(row) {
    var dateFields = [11,13,19,21,27,29,35,37,43,45,51,53,59,61,67,69,71,72]; // 0-based: K,M,S,U,AA,AC,AI,AK,AQ,AS,AY,BA,BG,BI,BO,BQ,BS,BT
    row = row.slice(); // Create a copy to avoid modifying original
    dateFields.forEach(function(col) {
      if (row[col] instanceof Date) {
        row[col] = Utilities.formatDate(row[col], Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
    });
    return row;
  });
  return data;
}

function getRowData(rowIndex) {
  var ss = SpreadsheetApp.openById('1QgLbwKanHB329n8OPb3u8T0CCkPhAzkBMT30vunEOFA');
  var sheet = ss.getSheetByName('DeviceList');
  if (!sheet) {
    throw new Error('Sheet "DeviceList" not found.');
  }
  var data = sheet.getRange(rowIndex, 1, 1, 73).getValues()[0]; // Columns A to BU (1 to 73)
  // Format dates to text
  var dateFields = [11,13,19,21,27,29,35,37,43,45,51,53,59,61,67,69,71,72]; // 1-based: K,M,S,U,AA,AC,AI,AK,AQ,AS,AY,BA,BG,BI,BO,BQ,BS,BT
  dateFields.forEach(function(col) {
    if (data[col-1] instanceof Date) {
      data[col-1] = Utilities.formatDate(data[col-1], Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  });
  return data;
}

function getSummaryData() {
  var ss = SpreadsheetApp.openById('1QgLbwKanHB329n8OPb3u8T0CCkPhAzkBMT30vunEOFA');
  var sheet = ss.getSheetByName('Device Summary');
  if (!sheet) {
    throw new Error('Sheet "Device Summary" not found.');
  }
  var data = sheet.getRange('A1:N10').getValues();
  // Format any dates in the data
  data = data.map(function(row) {
    return row.map(function(cell) {
      if (cell instanceof Date) {
        return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      return cell;
    });
  });
  return data;
}

function saveNewData(formData) {
  var ss = SpreadsheetApp.openById('1QgLbwKanHB329n8OPb3u8T0CCkPhAzkBMT30vunEOFA');
  var sheet = ss.getSheetByName('DeviceList');
  if (!sheet) {
    throw new Error('Sheet "DeviceList" not found.');
  }
  var lastRow = sheet.getLastRow();
  var serialNumber = 1; // Default for first entry
  if (lastRow > 1) { // If there are existing rows (excluding header)
    var lastSerial = sheet.getRange(lastRow, 1).getValue();
    serialNumber = (lastSerial && !isNaN(lastSerial)) ? Number(lastSerial) + 1 : lastRow;
  }
  var newRow = new Array(73).fill(''); // Empty array for 73 columns
  newRow[0] = serialNumber; // Set serial number in column A
  // Set user info: B=User Name, C=Pin, D=Campus, E=Official Num
  newRow[1] = formData.userName; // B=2 (0-based index 1)
  newRow[2] = formData.userPin;
  newRow[3] = formData.campusName;
  newRow[4] = formData.officialNumber;
  // Devices: up to 8
  setDeviceData(newRow, formData.device1, 5); // F=6 (index 5)
  setDeviceData(newRow, formData.device2, 13); // N=14 (index 13)
  setDeviceData(newRow, formData.device3, 21); // V=22 (index 21)
  setDeviceData(newRow, formData.device4, 29); // AD=30 (index 29)
  setDeviceData(newRow, formData.device5, 37); // AL=38 (index 37)
  setDeviceData(newRow, formData.device6, 45); // AT=46 (index 45)
  setDeviceData(newRow, formData.device7, 53); // BB=54 (index 53)
  setDeviceData(newRow, formData.device8, 61); // BJ=62 (index 61)
  // Additional
  newRow[69] = formData.remark; // BR=70 (index 69)
  newRow[70] = formData.sendToPiLabsDate; // BS=71 (index 70)
  newRow[71] = formData.receivedFromPiLabsDate; // BT=72 (index 71)
  newRow[72] = formData.roomNumber; // BU=73 (index 72)
  sheet.appendRow(newRow);
  var appendedRow = sheet.getLastRow();
  var textColumns = [5,12,14,20,22,28,30,36,38,44,46,52,54,60,62,68,70,72,73]; 
  textColumns.forEach(function(col) {
    sheet.getRange(appendedRow, col).setNumberFormat('@');
  });
  return 'Added successfully';
}

function updateRowData(rowIndex, formData) {
  var ss = SpreadsheetApp.openById('1QgLbwKanHB329n8OPb3u8T0CCkPhAzkBMT30vunEOFA');
  var sheet = ss.getSheetByName('DeviceList');
  if (!sheet) {
    throw new Error('Sheet "DeviceList" not found.');
  }
  var newRow = new Array(73).fill(''); // We'll overwrite existing
  var existing = sheet.getRange(rowIndex, 1, 1, 73).getValues()[0];
  newRow = existing.slice(); // Copy existing to preserve serial number
  // Update user info
  newRow[1] = formData.userName;
  newRow[2] = formData.userPin;
  newRow[3] = formData.campusName;
  newRow[4] = formData.officialNumber;
  // Update devices
  setDeviceData(newRow, formData.device1, 5);
  setDeviceData(newRow, formData.device2, 13);
  setDeviceData(newRow, formData.device3, 21);
  setDeviceData(newRow, formData.device4, 29);
  setDeviceData(newRow, formData.device5, 37);
  setDeviceData(newRow, formData.device6, 45);
  setDeviceData(newRow, formData.device7, 53);
  setDeviceData(newRow, formData.device8, 61);
  // Additional
  newRow[69] = formData.remark; // BR=70 (index 69)
  newRow[70] = formData.sendToPiLabsDate;
  newRow[71] = formData.receivedFromPiLabsDate;
  newRow[72] = formData.roomNumber;
  sheet.getRange(rowIndex, 1, 1, 73).setValues([newRow]);
  var textColumns = [5,12,14,20,22,28,30,36,38,44,46,52,54,60,62,68,70,72,73]; 
  textColumns.forEach(function(col) {
    sheet.getRange(rowIndex, col).setNumberFormat('@');
  });
  return 'Updated successfully';
}

function deleteDevice(rowIndex) {
  var ss = SpreadsheetApp.openById('1QgLbwKanHB329n8OPb3u8T0CCkPhAzkBMT30vunEOFA');
  var sheet = ss.getSheetByName('DeviceList');
  if (!sheet) {
    throw new Error('Sheet "DeviceList" not found.');
  }
  sheet.deleteRow(rowIndex);
  return 'Deleted successfully';
}

function setDeviceData(rowArray, device, startIndex) {
  if (device) {
    rowArray[startIndex] = device.type || '';
    rowArray[startIndex+1] = device.config || '';
    rowArray[startIndex+2] = device.serial || '';
    rowArray[startIndex+3] = device.quantity || '';
    rowArray[startIndex+4] = device.condition || '';
    rowArray[startIndex+5] = device.buyingDate || '';
    rowArray[startIndex+6] = device.purchaseName || '';
    rowArray[startIndex+7] = device.collectedDate || '';
  }
} 

/**
 * Sends highly polished HTML email notification for new workflow log
 */
function sendWorkflowSubmissionEmail(recipient, userName, date, workHistory, appUrl) {
  try {
    const brandColor = "#2563eb"; // Blue 600
    const viewUrl = appUrl || "https://ai.studio/build";
    const subject = "📝 New Workflow Submission - " + userName + " (" + date + ")";
    
    const htmlBody = 
      "<div style=\"font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 10px; margin: 0;\">" +
      "  <div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);\">" +
      "    <div style=\"background-color: " + brandColor + "; padding: 24px; text-align: center;\">" +
      "      <h1 style=\"color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;\">Workflow Management Notification</h1>" +
      "    </div>" +
      "    <div style=\"padding: 32px 24px; color: #334155;\">" +
      "      <h2 style=\"margin-top: 0; font-size: 16px; font-weight: 600; color: #0f172a;\">New Activity Log Logged</h2>" +
      "      <p style=\"font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;\">An active team member has successfully logged a new workflow in the system. See details below:</p>" +
      "      " +
      "      <table style=\"width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;\">" +
      "        <tr>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600; width: 120px;\">Member Name:</td>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 500;\">" + userName + "</td>" +
      "        </tr>" +
      "        <tr>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;\">Logged Date:</td>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;\">" + date + "</td>" +
      "        </tr>" +
      "        <tr>" +
      "          <td style=\"padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;\">Work History:</td>" +
      "          <td style=\"padding: 15px 0; color: #334155;\"><div style=\"line-height: 1.6; white-space: pre-wrap; background-color: #f8fafc; border-radius: 6px; padding: 12px; font-family: monospace; border: 1px solid #e2e8f0;\">" + workHistory + "</div></td>" +
      "        </tr>" +
      "      </table>" +
      "      " +
      "      <div style=\"text-align: center; margin-top: 32px;\">" +
      "        <a href=\"" + viewUrl + "\" style=\"display: inline-block; background-color: " + brandColor + "; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);\">View Workflow System</a>" +
      "      </div>" +
      "    </div>" +
      "    <div style=\"background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;\">" +
      "      Sent automatically by Google Apps Script MailApp Integration." +
      "    </div>" +
      "  </div>" +
      "</div>";

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody
    });
    Logger.log("Email successfully dispatched for workflow submission from: " + userName);
  } catch (e) {
    Logger.log("Failed to send workflow email: " + e.toString());
  }
}

/**
 * Sends highly polished HTML email notification for User status edits
 */
function sendUserStatusChangeEmail(recipient, userName, pin, nextStatus) {
  try {
    const brandColor = nextStatus === "Active" ? "#10b981" : "#ef4444"; // Emerald or Rose
    const subject = "🔐 Security Alert: User Status Changed for " + userName;
    
    const htmlBody = 
      "<div style=\"font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 10px; margin: 0;\">" +
      "  <div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);\">" +
      "    <div style=\"background-color: " + brandColor + "; padding: 24px; text-align: center;\">" +
      "      <h1 style=\"color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;\">Account Security Notification</h1>" +
      "    </div>" +
      "    <div style=\"padding: 32px 24px; color: #334155;\">" +
      "      <h2 style=\"margin-top: 0; font-size: 16px; font-weight: 600; color: #0f172a;\">Member Account Trigger</h2>" +
      "      <p style=\"font-size: 14px; line-height: 1.5; color: #64748b; margin-bottom: 24px;\">An administrator has changed the operational status of a team member's account profile.</p>" +
      "      " +
      "      <table style=\"width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;\">" +
      "        <tr>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600; width: 120px;\">Member Name:</td>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 500;\">" + userName + "</td>" +
      "        </tr>" +
      "        <tr>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;\">Member PIN:</td>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-family: monospace;\">" + pin + "</td>" +
      "        </tr>" +
      "        <tr>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;\">New Status:</td>" +
      "          <td style=\"padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: " + brandColor + ";\">" + nextStatus + "</td>" +
      "        </tr>" +
      "      </table>" +
      "    </div>" +
      "    <div style=\"background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;\">" +
      "      Sent automatically by Google Apps Script MailApp Security Hooks." +
      "    </div>" +
      "  </div>" +
      "</div>";

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody
    });
    Logger.log("Email successfully dispatched for user status change of: " + userName + " to: " + nextStatus);
  } catch (e) {
    Logger.log("Failed to send status change email: " + e.toString());
  }
}

/**
 * Sends highly polished test email notification
 */
function sendTestEmail(recipient, userName, appUrl) {
  try {
    const brandColor = "#4f46e5"; // Indigo 600
    const viewUrl = appUrl || "https://ai.studio/build";
    const subject = "🧪 Workflow System: Notification Test Connection";
    
    const htmlBody = 
      "<div style=\"font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 10px; margin: 0;\">" +
      "  <div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);\">" +
      "    <div style=\"background-color: " + brandColor + "; padding: 24px; text-align: center;\">" +
      "      <h1 style=\"color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;\">System Test Connection</h1>" +
      "    </div>" +
      "    <div style=\"padding: 32px 24px; color: #334155; text-align: center;\">" +
      "      <div style=\"font-size: 48px; margin-bottom: 16px;\">🎉</div>" +
      "      <h2 style=\"margin-top: 0; font-size: 18px; font-weight: 700; color: #0f172a;\">Connection Successful!</h2>" +
      "      <p style=\"font-size: 14px; line-height: 1.6; color: #64748b; max-width: 400px; margin: 0 auto 24px auto;\">Hello, " + userName + "! Your Google Apps Script MailApp test connection is working successfully. Automatic triggers will now send live updates for workflow submissions and team member status alerts.</p>" +
      "      " +
      "      <a href=\"" + viewUrl + "\" style=\"display: inline-block; background-color: " + brandColor + "; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;\">Enter Web Dashboard</a>" +
      "    </div>" +
      "    <div style=\"background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;\">" +
      "      Verified Connection via AI Studio Integration." +
      "    </div>" +
      "  </div>" +
      "</div>";

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (e) {
    throw new Error("Mailing connection error: " + e.toString());
  }
} 
```

