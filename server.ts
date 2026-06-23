import express from "express";
import path from "path";
import fs from "fs";
import os from "os";

const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === "1";

// Hardcoded fallback data in case the external JSON is missing or blank
const fallbackDbData = {
  users: [
    {
      sl: 1,
      name: "Nazmul",
      pin: "2653",
      role: "User",
      campus: "Motijheel ESM",
      status: "Active",
    },
    {
      sl: 2,
      name: "Manager Admin",
      pin: "8888",
      role: "Admin",
      campus: "Gulshan Branch",
      status: "Active",
    },
    {
      sl: 3,
      name: "Owner Super Admin",
      pin: "9999",
      role: "Super Admin",
      campus: "Head Office",
      status: "Active",
    },
    {
      sl: 4,
      name: "Admin S",
      pin: "44095",
      password: "440955",
      role: "Super Admin",
      campus: "Head Office",
      status: "Active",
    },
  ],
  workflows: [],
  permissions: {
    "Super Admin": [
      "my_profile",
      "enter_workflow",
      "history_workflow",
      "filter_workflow",
      "user_management",
      "attendance_report",
      "attendance_grid_report",
      "member_responsibility",
      "role_permission",
      "device_management",
    ],
    Admin: [
      "my_profile",
      "enter_workflow",
      "history_workflow",
      "filter_workflow",
      "user_management",
      "attendance_report",
      "attendance_grid_report",
      "member_responsibility",
      "device_management",
    ],
    User: ["my_profile", "enter_workflow", "history_workflow", "filter_workflow"],
  },
  devices: [],
  appscriptUrl:
    "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec",
  settings: {
    showLoginInstructions: true,
    emailNotificationsEnabled: true,
    notificationEmail: "rajuhd13@gmail.com"
  }
};

// We always keep the active writable database in the system's temporary directory to avoid read-only system errors
const ACTIVE_DB_PATH = path.join(os.tmpdir(), "workflow-esm-db.json");

// Helper to initialize active database in temp directory from template/bundle
function initActiveDB() {
  try {
    let seedData: any = null;
    // Try to load from process.cwd()/src/db/db.json
    try {
      const directSrcPath = path.join(process.cwd(), "src", "db", "db.json");
      if (fs.existsSync(directSrcPath)) {
        seedData = JSON.parse(fs.readFileSync(directSrcPath, "utf8"));
      }
    } catch (e) {
      // ignore
    }

    // Try alternative paths if process.cwd() didn't work (e.g. inside vercel or built asset structure)
    if (!seedData || !seedData.users) {
      try {
        const altPath = path.join(__dirname, "..", "src", "db", "db.json");
        if (fs.existsSync(altPath)) {
          seedData = JSON.parse(fs.readFileSync(altPath, "utf8"));
        }
      } catch (e) {
        // ignore
      }
    }

    let shouldWrite = false;
    let dataToSave = (seedData && seedData.users) ? seedData : fallbackDbData;

    if (!fs.existsSync(ACTIVE_DB_PATH)) {
      shouldWrite = true;
      console.log(`[Database] Active DB does not exist. Initializing: ${ACTIVE_DB_PATH}`);
    } else {
      // Active DB exists: verify if config, appscriptUrl or default users have been updated in code/manifest files
      try {
        const activeData = JSON.parse(fs.readFileSync(ACTIVE_DB_PATH, "utf8"));
        
        // If appscriptUrl changed in source db.json, overwrite config immediately to synchronize connectivity
        if (dataToSave && dataToSave.appscriptUrl && activeData.appscriptUrl !== dataToSave.appscriptUrl) {
          console.log(`[Database] appscriptUrl updated in source (${dataToSave.appscriptUrl}). Overwriting active DB to apply new integration.`);
          // Merge to preserve existing workflows/devices but update connectivity
          activeData.appscriptUrl = dataToSave.appscriptUrl;
          dataToSave = activeData;
          shouldWrite = true;
        }

        // Also ensure any newly specified admin users or default profile seeds (like Admin S) are merged in
        if (dataToSave && Array.isArray(dataToSave.users)) {
          let mergedUsers = [...activeData.users];
          let usersAdded = false;
          
          dataToSave.users.forEach((su: any) => {
            const hasUser = mergedUsers.some(
              (au: any) => String(au.pin).trim().toUpperCase() === String(su.pin).trim().toUpperCase()
            );
            if (!hasUser) {
              mergedUsers.push(su);
              usersAdded = true;
            }
          });
          
          if (usersAdded) {
            console.log("[Database] Merging new seed users from master directory.");
            activeData.users = mergedUsers;
            dataToSave = activeData;
            shouldWrite = true;
          }
        }
      } catch (e) {
        shouldWrite = true;
        console.warn("[Database] Active DB read failed. Overwriting with fresh template.", e);
      }
    }

    if (shouldWrite) {
      fs.writeFileSync(ACTIVE_DB_PATH, JSON.stringify(dataToSave, null, 2), "utf8");
    }
  } catch (err) {
    console.error("[Database] Failed to initialize active database:", err);
  }
}

// Ensure active DB is initialized on load
initActiveDB();

// Helper to read database
// Helper to read database
let cachedDBInMemory: any = null;

function readDB() {
  if (cachedDBInMemory) {
    return cachedDBInMemory;
  }
  try {
    initActiveDB();
    const data = fs.readFileSync(ACTIVE_DB_PATH, "utf8");
    const db = JSON.parse(data);

    // Dynamic schema validation & auto-patching of missing permissions
    let mutated = false;
    if (db && db.permissions) {
      // Ensure all Super Admin have member_responsibility and attendance_grid_report
      if (db.permissions["Super Admin"]) {
        if (!db.permissions["Super Admin"].includes("member_responsibility")) {
          const idx = db.permissions["Super Admin"].indexOf("role_permission");
          if (idx !== -1) {
            db.permissions["Super Admin"].splice(
              idx,
              0,
              "member_responsibility",
            );
          } else {
            db.permissions["Super Admin"].push("member_responsibility");
          }
          mutated = true;
        }
        if (!db.permissions["Super Admin"].includes("attendance_grid_report")) {
          // insert it near attendance_report or at the end
          db.permissions["Super Admin"].push("attendance_grid_report");
          mutated = true;
        }
        if (!db.permissions["Super Admin"].includes("my_profile")) {
          db.permissions["Super Admin"].push("my_profile");
          mutated = true;
        }
        if (!db.permissions["Super Admin"].includes("device_management")) {
          db.permissions["Super Admin"].push("device_management");
          mutated = true;
        }
      }

      // Ensure all Admin have member_responsibility, attendance_grid_report, and my_profile
      if (db.permissions["Admin"]) {
        if (!db.permissions["Admin"].includes("member_responsibility")) {
          db.permissions["Admin"].push("member_responsibility");
          mutated = true;
        }
        if (!db.permissions["Admin"].includes("attendance_grid_report")) {
          db.permissions["Admin"].push("attendance_grid_report");
          mutated = true;
        }
        if (!db.permissions["Admin"].includes("my_profile")) {
          db.permissions["Admin"].push("my_profile");
          mutated = true;
        }
        if (!db.permissions["Admin"].includes("device_management")) {
          db.permissions["Admin"].push("device_management");
          mutated = true;
        }
      }

      // Ensure all User have my_profile
      if (db.permissions["User"]) {
        if (!db.permissions["User"].includes("my_profile")) {
          // Add my_profile to the beginning
          db.permissions["User"].unshift("my_profile");
          mutated = true;
        }
      }
    }

    if (!db.users || !Array.isArray(db.users)) {
      db.users = [];
      mutated = true;
    }

    // Ensure the requested Admin S user is always present in the database
    const hasAdminS = db.users.some(
      (u: any) => String(u.pin).toUpperCase() === "44095" || String(u.pin).toUpperCase() === "4409S"
    );
    if (!hasAdminS) {
      db.users.push({
        sl: db.users.length > 0 ? Math.max(...db.users.map((u: any) => u.sl || 0)) + 1 : 1,
        name: "Admin S",
        pin: "44095",
        password: "440955",
        role: "Super Admin",
        campus: "Head Office",
        status: "Active"
      });
      mutated = true;
    } else {
      // Ensure the password and active status are correct
      const adminSIndex = db.users.findIndex(
        (u: any) => String(u.pin).toUpperCase() === "44095" || String(u.pin).toUpperCase() === "4409S"
      );
      if (adminSIndex !== -1) {
        let changed = false;
        // Make sure its PIN is the updated 44095 if it was old 4409S
        if (db.users[adminSIndex].pin !== "44095") {
          db.users[adminSIndex].pin = "44095";
          changed = true;
        }
        if (db.users[adminSIndex].password !== "440955") {
          db.users[adminSIndex].password = "440955";
          changed = true;
        }
        if (db.users[adminSIndex].status !== "Active") {
          db.users[adminSIndex].status = "Active";
          changed = true;
        }
        if (db.users[adminSIndex].role !== "Super Admin") {
          db.users[adminSIndex].role = "Super Admin";
          changed = true;
        }
        if (changed) {
          mutated = true;
        }
      }
    }
    if (!db.workflows || !Array.isArray(db.workflows)) {
      db.workflows = [];
      mutated = true;
    }
    if (!db.permissions || typeof db.permissions !== "object") {
      db.permissions = {};
      mutated = true;
    }
    if (!db.devices || !Array.isArray(db.devices)) {
      db.devices = [];
      mutated = true;
    }

    if (!db.settings || typeof db.settings !== "object") {
      db.settings = {
        showLoginInstructions: true,
        emailNotificationsEnabled: true,
        notificationEmail: "rajuhd13@gmail.com"
      };
      mutated = true;
    } else {
      if (db.settings.emailNotificationsEnabled === undefined) {
        db.settings.emailNotificationsEnabled = true;
        mutated = true;
      }
      if (db.settings.notificationEmail === undefined) {
        db.settings.notificationEmail = "rajuhd13@gmail.com";
        mutated = true;
      }
    }

    if (mutated) {
      try {
        fs.writeFileSync(ACTIVE_DB_PATH, JSON.stringify(db, null, 2), "utf8");
      } catch (err) {
        console.warn("[Database] Ignored non-fatal write error during mutation sync:", err);
      }
    }

    cachedDBInMemory = db;
    return db;
  } catch (err) {
    console.error("Error reading database file from active temp path:", err);
    const fallback = { users: fallbackDbData.users, workflows: [], permissions: fallbackDbData.permissions, devices: [], settings: {} };
    cachedDBInMemory = fallback;
    return fallback;
  }
}

// Helper to write database
function writeDB(data: any) {
  try {
    cachedDBInMemory = data;
    fs.writeFileSync(ACTIVE_DB_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing database file to active temp path:", err);
    return false;
  }
}

// Helper to get month key from YYYY-MM-DD (timezone-safe)
function getMonthKey(dateStr: string): string {
  if (!dateStr) return "Unknown";
  const parts = String(dateStr).split("-");
  if (parts.length < 2) return "Unknown";
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return "Unknown";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const m = months[month];
  const y = String(year).slice(-2);
  return `${m}-${y}`;
}

// Global utility to perform real-time Apps Script background sync
function syncToAppsScript(payload: any) {
  const db = readDB();
  const url =
    db.appscriptUrl ||
    "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec";
  if (!url) return;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Apps Script synchronization response:", data);
    })
    .catch((err) => {
      console.error(
        "Apps Script background synchronization failed:",
        err.message || err,
      );
    });
}

let lastUsersSyncTime = 0;
let lastWorkflowsSyncTime = 0;
const SYNC_THROTTLE_MS = 30000; // 30 seconds throttle

// Utility to fetch and sync users list from Google Sheets Apps Script URL
async function syncUsersFromAppsScript(url: string, force = false) {
  if (!url) return;
  const now = Date.now();
  if (!force && (now - lastUsersSyncTime < SYNC_THROTTLE_MS)) {
    console.log("[Sync Users] Throttled request: Last sync was less than 30s ago, skipping to avoid concurrency issues.");
    return;
  }
  lastUsersSyncTime = now;
  try {
    const fetchUrl = `${url}${url.includes("?") ? "&" : "?"}action=getUsers`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6500); // 6.5s timeout for resilient cold-start sync

    const res = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(id);
    const data = await res.json();

    if (data && data.success && Array.isArray(data.data)) {
      const db = readDB();
      const sheetUsers = data.data.map((u: any) => ({
        sl: Number(u.sl || u.Sl || u.SL || 0),
        name: String(u.name || u.Name || "").trim(),
        pin: String(u.pin || u.Pin || u.PIN || "").trim(),
        role: String(u.role || u.Role || "User").trim(),
        campus: String(u.campus || u.Campus || "").trim(),
        status: String(u.status || u.Status || "Active").trim(),
        password: String(u.password || u.Password || u.H || "").trim(),
        customPermissions: String(u.permission || u.Permission || u.permissions || u.Permissions || u.G || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }));

      if (sheetUsers.length > 0) {
        // Merge with existing properties like local password or permissions if sheet returns empty
        const finalUsers = sheetUsers.map((sheetUser: any) => {
          const existing = db.users.find(
            (u: any) => String(u.pin).trim().toUpperCase() === String(sheetUser.pin).trim().toUpperCase(),
          );
          return {
            ...sheetUser,
            password:
              sheetUser.password || (existing && existing.password) || "",
            customPermissions:
              sheetUser.customPermissions &&
              sheetUser.customPermissions.length > 0
                ? sheetUser.customPermissions
                : (existing && existing.customPermissions) || [],
          };
        });

        // CRITICAL SAFETY FOR VERCEL: Preserve local-only users (like seeded backdoor Super Admins or manually added local profiles)
        // who are not listed in the Google Sheet. This prevents them from being deleted upon synchronization.
        db.users.forEach((localUser: any) => {
          if (localUser && localUser.pin) {
            const existsInSheet = sheetUsers.some(
              (su: any) => String(su.pin).trim().toUpperCase() === String(localUser.pin).trim().toUpperCase()
            );
            if (!existsInSheet) {
              finalUsers.push(localUser);
            }
          }
        });

        db.users = finalUsers;
        writeDB(db);
        console.log(
          `Sync users: loaded ${sheetUsers.length} records from Google Sheets, merged and preserved ${finalUsers.length - sheetUsers.length} local-only accounts.`,
        );
      }
    }
  } catch (err: any) {
    console.warn(
      "Google Sheets user directory sync bypassed:",
      err.message || err,
    );
  }
}

// Utility to fetch and build local nested workflows map from flat worksheet rows
async function syncWorkflowsFromAppsScript(url: string, force = false) {
  if (!url) return;
  const now = Date.now();
  if (!force && (now - lastWorkflowsSyncTime < SYNC_THROTTLE_MS)) {
    console.log("[Sync Workflows] Throttled request: Last sync was less than 30s ago, skipping to avoid concurrency issues.");
    return;
  }
  lastWorkflowsSyncTime = now;
  try {
    const fetchUrl = `${url}${url.includes("?") ? "&" : "?"}action=getWorkflows`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000); // 6s timeout for workflow loading

    const res = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(id);
    const data = await res.json();

    if (data && data.success && Array.isArray(data.data)) {
      const db = readDB();
      const rowMap: { [pin: string]: any } = {};

      data.data.forEach((item: any) => {
        const pin = String(item.pin || "").trim();
        if (!pin) return;

        if (!rowMap[pin]) {
          rowMap[pin] = {
            sl: Number(item.rowSl || 1),
            timestamp: item.timestamp || new Date().toISOString(),
            name: String(item.name || "").trim(),
            pin: pin,
            campus: String(item.campus || "").trim(),
            responsibility: String(item.responsibility || "").trim(),
          };
        }

        const monthKey = String(item.monthKey || "").trim();
        if (monthKey && /^[A-Z][a-z][a-z]-\d\d$/.test(monthKey)) {
          if (!rowMap[pin][monthKey]) {
            rowMap[pin][monthKey] = [];
            const resp = String(item.responsibility || "").trim();
            if (resp) {
              rowMap[pin][monthKey].push({ responsibility: resp });
            }
          }

          const dtStr = String(item.date || "");
          const histStr = String(item.workHistory || "").trim();

          if (dtStr || histStr) {
            rowMap[pin][monthKey].push({
              sl: Number(item.entrySl || 1),
              date: dtStr.split("T")[0],
              workHistory: histStr,
            });
          }
        }
      });

      const workflowsList = Object.values(rowMap).map((row: any) => {
        const rowData: any = {
          sl: row.sl,
          timestamp: row.timestamp,
          name: row.name,
          pin: row.pin,
          campus: row.campus,
          responsibility: row.responsibility,
        };

        Object.keys(row).forEach((key) => {
          if (/^[A-Z][a-z][a-z]-\d\d$/.test(key)) {
            const entries = row[key];
            entries.sort((a: any, b: any) => a.sl - b.sl);
            rowData[key] = JSON.stringify(entries);
          }
        });

        return rowData;
      });

      if (workflowsList.length > 0) {
        db.workflows = workflowsList;
        writeDB(db);
        console.log(
          `Sync workflows: compiled ${workflowsList.length} user record groups with Google Sheets.`,
        );
      }
    }
  } catch (err: any) {
    console.warn("Google Sheets workflow sync bypassed:", err.message || err);
  }
}

// Helper to sync device from fetch data
async function syncDevicesFromAppsScript(url: string) {
  if (!url) return;
  try {
    console.log("Initiating Device Registry sync from Google Sheets...");
    const fetchUrl = `${url}${url.includes("?") ? "&" : "?"}action=getDeviceList`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(id);
    
    if (!res.ok) {
      throw new Error(`Apps Script returned status ${res.status}`);
    }

    const data = await res.json();

    if (data && data.success && Array.isArray(data.data)) {
      const db = readDB();
      db.devices = data.data;
      writeDB(db);
      console.log(`Successfully synced ${data.data.length} device records from Google Sheets.`);
      return { success: true, count: data.data.length };
    } else {
      throw new Error(data.error || "Malformed response from Apps Script");
    }
  } catch (err: any) {
    console.error("Device Registry sync failed:", err.message || err);
    return { success: false, error: err.message };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Vercel Serverless Route path fixer: Prepend /api if Vercel stripped it, or reconstruct from original path/header
  app.use((req: any, res: any, next: any) => {
    if (isVercel) {
      try {
        const originalUrl = req.url || "";
        const urlObj = new URL(originalUrl, "http://localhost");
        const origPathQuery = urlObj.searchParams.get("_original_path") || (req.query && req.query._original_path);
        const matchedPathHeader = req.headers["x-matched-path"];

        if (origPathQuery) {
          const pathStr = Array.isArray(origPathQuery) ? origPathQuery.join("/") : String(origPathQuery);
          urlObj.searchParams.delete("_original_path");
          urlObj.pathname = "/api/" + pathStr.replace(/^\/+/, "");
          req.url = urlObj.pathname + urlObj.search;
          
          // Sync and populate req.query for Express
          req.query = req.query || {};
          delete req.query._original_path;
          urlObj.searchParams.forEach((val: any, key: any) => {
            req.query[key] = val;
          });
          
          console.log(`[Vercel Route Fixer] Reconstructed from Query: ${originalUrl} -> ${req.url}`);
        } else if (matchedPathHeader && String(matchedPathHeader) !== "/api/index") {
          const matchedPathStr = String(matchedPathHeader);
          urlObj.pathname = matchedPathStr;
          req.url = urlObj.pathname + urlObj.search;
          console.log(`[Vercel Route Fixer] Reconstructed from Header: ${originalUrl} -> ${req.url}`);
        } else if (req.url.startsWith("/api/index")) {
          // If URL is mapped to api/index but has no specified origPathQuery, let's treat it as-is or check if it needs cleanup
          console.log(`[Vercel Route Fixer] Index API matched, keeping url: ${req.url}`);
        } else if (!req.url.startsWith("/api")) {
          const separator = req.url.startsWith("/") ? "" : "/";
          req.url = "/api" + separator + req.url;
          console.log(`[Vercel Route Fixer] Prepended /api: ${originalUrl} -> ${req.url}`);
        } else {
          console.log(`[Server Request] Method=${req.method} URL=${req.url}`);
        }

        // CRITICAL: Express caches parsed URL. Clear cache so Express re-parses our modified req.url!
        try { delete req._parsedUrl; } catch (e) {}
        try { delete req._parsedUrlSelf; } catch (e) {}
        try { delete req.path; } catch (e) {}
        try { delete req._path; } catch (e) {}
        
      } catch (err) {
        console.error("Vercel route fixer error:", err);
      }
    } else {
      console.log(`[Server Request] Method=${req.method} URL=${req.url}`);
    }
    next();
  });

  // CORS headers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept",
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    next();
  });

  // API Route: Automatically sync users from Google Sheets when login page mounts
  app.post("/api/auth/sync-on-login-mount", async (req, res) => {
    try {
      const db = readDB();
      const url =
        db.appscriptUrl ||
        "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec";
      
      if (url) {
        console.log("[Login Mount] Performing automatic background user sync...");
        await syncUsersFromAppsScript(url);
      }
      res.json({ success: true, message: "Users sync executed successfully on login mount." });
    } catch (err: any) {
      console.warn("[Login Mount] Sync error:", err);
      res.json({ success: false, error: err.message || String(err) });
    }
  });

  // API Route: Detect User Info via PIN instantly (Login auto-check)
  app.get("/api/auth/detect", async (req, res) => {
    const { pin } = req.query;
    if (!pin) {
      return res.status(400).json({ success: false, error: "PIN is required" });
    }

    try {
      const db = readDB();
      const url =
        db.appscriptUrl ||
        "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec";
      
      const hasStoredUsers = db && db.users && db.users.length > 0;
      if (url) {
        if (!hasStoredUsers) {
          // If we have absolutely NO users seeded, we MUST await sync to boot the user list, bypassing throttle
          await syncUsersFromAppsScript(url, true).catch(e => console.warn("Awaited detection sync warning:", e));
        } else {
          // If we already have users populated, do NOT block the instant PIN check on a slow Google Sheets API load.
          // Run the synchronizer in the background so that updates are pulled without causing connection timeouts (500) under Serverless Vercel.
          syncUsersFromAppsScript(url, false).catch(e => console.warn("Background detection sync warning:", e));
        }
      }

      // Check current state (either updated by background sync or fallback)
      const freshDb = readDB();
      const user = freshDb.users.find(
        (u: any) => String(u.pin).trim().toUpperCase() === String(pin).trim().toUpperCase(),
      );

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "No user found with this PIN." });
      }

      res.json({ success: true, user });
    } catch (err: any) {
      console.error("Detect Error:", err);
      res.status(500).json({
        success: false,
        error: "Authentication service temporarily unavailable.",
        details: err.message || String(err),
        stack: err.stack
      });
    }
  });

  // API Route: Login Verification (Enforces Status Check too)
  app.post("/api/auth/login", async (req, res) => {
    const { pin, password } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: "PIN is required" });
    }

    try {
      const db = readDB();
      const url =
        db.appscriptUrl ||
        "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec";
      
      const hasStoredUsers = db && db.users && db.users.length > 0;
      if (url) {
        if (!hasStoredUsers) {
          await syncUsersFromAppsScript(url, true).catch(e => console.warn("Login pre-sync warning:", e));
        } else {
          // Non-blocking in background to keep login action ultra-fast and resilient against sheet latency
          syncUsersFromAppsScript(url, false).catch(e => console.warn("Background login sync warning:", e));
        }
      }

      const freshDb = readDB();
      const user = freshDb.users.find(
        (u: any) => String(u.pin).trim().toUpperCase() === String(pin).trim().toUpperCase(),
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Invalid PIN. No profile was matched.",
        });
      }

      if (user.password && user.password !== password) {
        return res
          .status(403)
          .json({ success: false, error: "Incorrect password provided." });
      }

      if (user.status !== "Active") {
        return res.status(403).json({
          success: false,
          error:
            "Your profile status is Inactive. Please contact your administrator.",
        });
      }

      // Return the authorized user details and custom session permission tags
      let activePermissions = freshDb.permissions[user.role] || [];
      if (user.customPermissions && Array.isArray(user.customPermissions)) {
        activePermissions = Array.from(
          new Set([...activePermissions, ...user.customPermissions]),
        );
      }

      res.json({
        success: true,
        user,
        permissions: activePermissions,
      });
    } catch (err: any) {
      console.error("Login Error:", err);
      res.status(500).json({ success: false, error: "Login service error." });
    }
  });

  // API Route: Submit new workflow
  app.post("/api/workflow/submit", (req, res) => {
    const { pin, date, workHistory } = req.body;

    if (!pin || !date || !workHistory) {
      return res.status(400).json({
        success: false,
        error: "Missing required workflow properties: pin, date, workHistory",
      });
    }

    const db = readDB();
    const user = db.users.find(
      (u: any) => String(u.pin) === String(pin).trim(),
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User authentication fails. Incorrect PIN.",
      });
    }

    if (user.status !== "Active") {
      return res.status(403).json({
        success: false,
        error: "Profile status is currently Inactive.",
      });
    }

    const monthKey = getMonthKey(date);
    if (monthKey === "Unknown") {
      return res
        .status(400)
        .json({ success: false, error: "Invalid date value." });
    }

    // Locate or create user row in workflow list
    let workflowRow = db.workflows.find(
      (w: any) => String(w.pin) === String(pin),
    );

    if (!workflowRow) {
      const newSl = db.workflows.length + 1;
      workflowRow = {
        timestamp: new Date().toISOString(),
        sl: newSl,
        name: user.name,
        pin: user.pin,
        campus: user.campus,
      };
      db.workflows.push(workflowRow);
    }

    // Retrieve or initialize month's cell array
    let monthEntries: any[] = [];
    const existingCell = workflowRow[monthKey];
    if (existingCell) {
      try {
        monthEntries =
          typeof existingCell === "string"
            ? JSON.parse(existingCell)
            : existingCell;
      } catch (err) {
        monthEntries = [];
      }
    }

    if (!Array.isArray(monthEntries)) {
      monthEntries = [];
    }

    // Extract responsibility from month entries if it exists
    const respObj = monthEntries.find(
      (e: any) => e && typeof e === "object" && "responsibility" in e,
    );
    const existingResponsibility = respObj
      ? respObj.responsibility
      : workflowRow.responsibility || "";

    const entrySl =
      monthEntries.filter(
        (e: any) => e && typeof e === "object" && !("responsibility" in e),
      ).length + 1;
    monthEntries.push({
      sl: entrySl,
      date,
      workHistory,
    });

    // Save back to db.json
    workflowRow[monthKey] = JSON.stringify(monthEntries);
    workflowRow.timestamp = new Date().toISOString();

    // Verify user profile details sync up
    workflowRow.name = user.name;
    workflowRow.campus = user.campus;

    writeDB(db);

    const settings = db.settings || {};
    const emailNotificationsEnabled = settings.emailNotificationsEnabled !== false;
    const notificationEmail = settings.notificationEmail || "rajuhd13@gmail.com";
    const appUrl = process.env.APP_URL || `https://${req.get("host")}`;

    // Sync in background to Google Sheets via Apps Script Web App
    syncToAppsScript({
      action: "submitWorkflow",
      pin: user.pin,
      date,
      workHistory: workHistory.trim(),
      responsibility: existingResponsibility,
      emailNotificationsEnabled,
      notificationEmail,
      appUrl,
    });

    res.json({
      success: true,
      message: `Workflow saved successfully under month ${monthKey}.`,
      activeMonth: monthKey,
    });
  });

  app.post("/api/workflow/edit", (req, res) => {
    const { pin, monthKey, entrySl, date, workHistory } = req.body;

    if (!pin || !monthKey || !entrySl || !date || !workHistory) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required workflow properties: pin, monthKey, entrySl, date, workHistory",
      });
    }

    const db = readDB();
    const user = db.users.find(
      (u: any) => String(u.pin) === String(pin).trim(),
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User authentication fails. Incorrect PIN.",
      });
    }

    let workflowRow = db.workflows.find(
      (w: any) => String(w.pin) === String(pin),
    );

    if (!workflowRow || !workflowRow[monthKey]) {
      return res
        .status(404)
        .json({ success: false, error: "Workflow entry not found." });
    }

    let monthEntries: any[] = [];
    try {
      const rawCell = workflowRow[monthKey];
      monthEntries =
        typeof rawCell === "string" ? JSON.parse(rawCell) : rawCell;
    } catch (e) {
      return res
        .status(404)
        .json({ success: false, error: "Failed to parse workflow entries." });
    }

    if (!Array.isArray(monthEntries)) {
      return res.status(404).json({
        success: false,
        error: "Invalid workflow entries data structure.",
      });
    }

    const entryToEdit = monthEntries.find((e) => e.sl === Number(entrySl));
    if (!entryToEdit) {
      return res
        .status(404)
        .json({ success: false, error: "Specific workflow entry not found." });
    }

    // Update the properties
    entryToEdit.date = date;
    entryToEdit.workHistory = workHistory;

    workflowRow[monthKey] = JSON.stringify(monthEntries);
    workflowRow.timestamp = new Date().toISOString();
    writeDB(db);

    return res.json({
      success: true,
      message: "Workflow updated successfully!",
    });
  });

  // API Route: Get flattened and annotated workflows list for history & advanced filtering
  app.get("/api/workflow/history", async (req, res) => {
    const { pin, role, sync } = req.query;

    const db = readDB();
    const url =
      db.appscriptUrl ||
      "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec";
    
    const forceSync = sync === "true";
    const hasWorkflows = db && db.workflows && db.workflows.length > 0;
    if (url) {
      if (!hasWorkflows) {
        await syncWorkflowsFromAppsScript(url, true).catch(e => console.warn("Blocking workflow history sync warning:", e));
      } else {
        syncWorkflowsFromAppsScript(url, forceSync).catch(e => console.warn("Background workflow history sync warning:", e));
      }
    }

    const freshDb = readDB();
    const flatWorkflows: any[] = [];

    freshDb.workflows.forEach((row: any) => {
      // Loop across each column key
      Object.keys(row).forEach((key) => {
        // Find keys pattern corresponding to monthly column: MMM-YY (e.g., Jul-26, Jun-26)
        if (/^[A-Z][a-z][a-z]-\d\d$/.test(key)) {
          let entries = [];
          try {
            const rawCell = row[key];
            entries =
              typeof rawCell === "string" ? JSON.parse(rawCell) : rawCell;
          } catch (e) {
            entries = [];
          }

          if (Array.isArray(entries)) {
            const respObj = entries.find(
              (e: any) => e && typeof e === "object" && "responsibility" in e,
            );
            const monthlyResponsibility = respObj
              ? respObj.responsibility
              : row.responsibility || "";

            entries.forEach((entry: any) => {
              if (
                entry &&
                typeof entry === "object" &&
                !("responsibility" in entry)
              ) {
                flatWorkflows.push({
                  rowSl: row.sl,
                  timestamp: row.timestamp,
                  name: row.name,
                  pin: row.pin,
                  campus: row.campus,
                  responsibility: monthlyResponsibility,
                  monthKey: key,
                  entrySl: entry.sl,
                  date: entry.date,
                  workHistory: entry.workHistory,
                });
              }
            });
          }
        }
      });
    });

    // Filter based on context
    let results = flatWorkflows;
    if (role === "User" && pin) {
      // Regular user can ONLY fetch their own history
      results = flatWorkflows.filter((w) => String(w.pin) === String(pin));
    } else if (pin) {
      // Admin/Super Admin can optionally filter as well by PIN
      results = flatWorkflows.filter((w) => String(w.pin) === String(pin));
    }

    // Sort descending by date, then by sl entry desc
    results.sort((a, b) => {
      const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.entrySl - a.entrySl;
    });

    res.json({ success: true, data: results });
  });

  // API Route: Get responsibilities for all users by month Key
  app.get("/api/workflow/responsibility", (req, res) => {
    const monthKey = req.query.monthKey as string;
    if (!monthKey) {
      return res
        .status(400)
        .json({ success: false, error: "monthKey is required" });
    }
    const db = readDB();
    const results = db.workflows.map((row: any) => {
      let entries = [];
      if (row[monthKey]) {
        try {
          entries =
            typeof row[monthKey] === "string"
              ? JSON.parse(row[monthKey])
              : row[monthKey];
        } catch (e) {
          entries = [];
        }
      }
      const respObj = Array.isArray(entries)
        ? entries.find(
            (e: any) => e && typeof e === "object" && "responsibility" in e,
          )
        : null;
      return {
        pin: row.pin,
        responsibility: respObj
          ? respObj.responsibility
          : row.responsibility || "",
      };
    });
    res.json({ success: true, data: results });
  });

  // API Route: Save responsibility for specific user and month
  app.post("/api/workflow/responsibility", (req, res) => {
    const { pin, monthKey, responsibility } = req.body;
    if (!pin || !monthKey) {
      return res.status(400).json({
        success: false,
        error: "Missing required properties: pin, monthKey",
      });
    }

    const db = readDB();
    const user = db.users.find(
      (u: any) => String(u.pin) === String(pin).trim(),
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "User profile not found." });
    }

    let workflowRow = db.workflows.find(
      (w: any) => String(w.pin) === String(pin).trim(),
    );
    if (!workflowRow) {
      const newSl = db.workflows.length + 1;
      workflowRow = {
        timestamp: new Date().toISOString(),
        sl: newSl,
        name: user.name,
        pin: user.pin,
        campus: user.campus,
      };
      db.workflows.push(workflowRow);
    }

    let monthEntries = [];
    const existingCell = workflowRow[monthKey];
    if (existingCell) {
      try {
        monthEntries =
          typeof existingCell === "string"
            ? JSON.parse(existingCell)
            : existingCell;
      } catch (err) {
        monthEntries = [];
      }
    }

    if (!Array.isArray(monthEntries)) {
      monthEntries = [];
    }

    let respObj = monthEntries.find(
      (e: any) => e && typeof e === "object" && "responsibility" in e,
    );
    if (respObj) {
      respObj.responsibility = String(responsibility || "").trim();
    } else {
      monthEntries.push({
        responsibility: String(responsibility || "").trim(),
      });
    }

    workflowRow[monthKey] = JSON.stringify(monthEntries);
    workflowRow.responsibility = String(responsibility || "").trim();
    workflowRow.timestamp = new Date().toISOString();

    writeDB(db);

    // Sync in background to Google Sheets via Apps Script Web App without generating workHistory log
    syncToAppsScript({
      action: "submitWorkflow",
      pin: user.pin,
      responsibility: String(responsibility || "").trim(),
    });

    res.json({
      success: true,
      message: "Responsibility updated successfully.",
    });
  });

  // API Route: Get Users (Admin & Super Admin only)
  app.get("/api/users", async (req, res) => {
    const db = readDB();
    const url =
      db.appscriptUrl ||
      "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec";
    
    const forceSync = req.query.sync === "true";
    const hasStoredUsers = db && db.users && db.users.length > 0;
    if (url) {
      if (!hasStoredUsers) {
        await syncUsersFromAppsScript(url, true).catch(e => console.warn("Blocking users GET sync error:", e));
      } else {
        syncUsersFromAppsScript(url, forceSync).catch(e => console.warn("Background users GET sync error:", e));
      }
    }
    const freshDb = readDB();
    res.json({ success: true, data: freshDb.users });
  });

  // API Route: Add User
  app.post("/api/users", (req, res) => {
    const { name, pin, role, campus, status } = req.body;

    if (!name || !pin || !role || !campus || !status) {
      return res.status(400).json({
        success: false,
        error: "Please complete all required fields.",
      });
    }

    const db = readDB();
    const exists = db.users.some(
      (u: any) => String(u.pin).trim().toUpperCase() === String(pin).trim().toUpperCase(),
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        error: "A user with this unique PIN already exists.",
      });
    }

    const nextSl =
      db.users.reduce((max: number, u: any) => Math.max(max, u.sl || 0), 0) + 1;

    const newUser = {
      sl: nextSl,
      name: name.trim(),
      pin: String(pin).trim(),
      role,
      campus,
      status,
    };

    db.users.push(newUser);
    writeDB(db);

    // Sync in background to Google Sheets via Apps Script Web App
    syncToAppsScript({
      action: "addUser",
      pin: newUser.pin,
      name: newUser.name,
      role: newUser.role,
      campus: newUser.campus,
      status: newUser.status,
    });

    res.json({
      success: true,
      message: "User added successfully.",
      data: newUser,
    });
  });

  // API Route: Update own user Profile (e.g. Password)
  app.put("/api/users/profile", (req, res) => {
    const { pin, password } = req.body;

    if (!pin)
      return res
        .status(400)
        .json({ success: false, error: "Missing identity." });

    const db = readDB();
    const userIndex = db.users.findIndex(
      (u: any) => String(u.pin).trim().toUpperCase() === String(pin).trim().toUpperCase(),
    );

    if (userIndex === -1) {
      return res
        .status(404)
        .json({ success: false, error: "User profile not found." });
    }

    db.users[userIndex].password = String(password || "").trim();
    writeDB(db);

    // Tell Apps Script to update user (this acts as the bridge to Users sheet H column hook)
    syncToAppsScript({
      action: "editUser",
      pin: pin,
      password: db.users[userIndex].password,
    });

    res.json({
      success: true,
      message: "Profile credentials updated successfully.",
    });
  });

  // API Route: Update User
  app.put("/api/users/:pin", (req, res) => {
    const targetPin = req.params.pin;
    const { name, role, campus, status, pin: newPin } = req.body;

    const db = readDB();
    const userIndex = db.users.findIndex(
      (u: any) => String(u.pin).trim().toUpperCase() === String(targetPin).trim().toUpperCase(),
    );

    if (userIndex === -1) {
      return res
        .status(404)
        .json({ success: false, error: "User profile not found." });
    }

    // If change pin, ensure it's not already duplicated elsewhere
    if (newPin && String(newPin).trim().toUpperCase() !== String(targetPin).trim().toUpperCase()) {
      const pinOverlap = db.users.some(
        (u: any) => String(u.pin).trim().toUpperCase() === String(newPin).trim().toUpperCase(),
      );
      if (pinOverlap) {
        return res.status(400).json({
          success: false,
          error: "The new PIN is already assigned to another user.",
        });
      }
      db.users[userIndex].pin = String(newPin).trim();

      // update workflows table pins if present
      db.workflows.forEach((w: any) => {
        if (String(w.pin).trim().toUpperCase() === String(targetPin).trim().toUpperCase()) {
          w.pin = String(newPin).trim();
        }
      });
    }

    if (name) db.users[userIndex].name = name.trim();
    if (role) db.users[userIndex].role = role;
    if (campus) db.users[userIndex].campus = campus;
    if (status) db.users[userIndex].status = status;

    // Cascade name or campus update to their workflows row
    const userPin = db.users[userIndex].pin;
    const workflowRow = db.workflows.find(
      (w: any) => String(w.pin).trim().toUpperCase() === String(userPin).trim().toUpperCase(),
    );
    if (workflowRow) {
      if (name) workflowRow.name = name.trim();
      if (campus) workflowRow.campus = campus;
    }

    writeDB(db);

    const settings = db.settings || {};
    const emailNotificationsEnabled = settings.emailNotificationsEnabled !== false;
    const notificationEmail = settings.notificationEmail || "rajuhd13@gmail.com";
    
    // Sync to Apps Script
    syncToAppsScript({
      action: "editUser",
      pin: db.users[userIndex].pin,
      name: db.users[userIndex].name,
      role: db.users[userIndex].role,
      campus: db.users[userIndex].campus,
      status: db.users[userIndex].status,
      emailNotificationsEnabled,
      notificationEmail,
    });

    res.json({
      success: true,
      message: "User profile updated successfully.",
      data: db.users[userIndex],
    });
  });

  // API Route: Update individual User permissions (User Wish Permissions)
  app.put("/api/users/:pin/permissions", (req, res) => {
    const targetPin = req.params.pin;
    const { permissions } = req.body;

    const db = readDB();
    const userIndex = db.users.findIndex(
      (u: any) => String(u.pin).trim().toUpperCase() === String(targetPin).trim().toUpperCase(),
    );

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: "User profile not found." });
    }

    db.users[userIndex].customPermissions = permissions || [];
    writeDB(db);
    
    // Sync to Apps Script
    syncToAppsScript({
      action: "editUser",
      pin: targetPin,
      permission: JSON.stringify(db.users[userIndex].customPermissions)
    });

    res.json({
      success: true,
      message: "Custom permissions updated for user.",
      data: db.users[userIndex].customPermissions,
    });
  });

  // API Route: Delete User
  app.delete("/api/users/:pin", (req, res) => {
    const targetPin = req.params.pin;

    const db = readDB();
    const initialCount = db.users.length;
    db.users = db.users.filter((u: any) => String(u.pin).trim().toUpperCase() !== String(targetPin).trim().toUpperCase());

    if (db.users.length === initialCount) {
      return res
        .status(404)
        .json({ success: false, error: "User profile not found." });
    }

    // Optionally keep or purge workflow history
    // For safety during tests, let's keep historical workflows row or filter them.
    // Purging user row makes sense to align with sheet cleanup:
    db.workflows = db.workflows.filter(
      (w: any) => String(w.pin).trim().toUpperCase() !== String(targetPin).trim().toUpperCase(),
    );

    writeDB(db);

    // Sync to Apps Script
    syncToAppsScript({
      action: "deleteUser",
      pin: targetPin
    });

    res.json({
      success: true,
      message: "User record deleted successfully from system.",
    });
  });

  // API Route: Get & Edit Permissions Matrices
  app.get("/api/permissions", (req, res) => {
    const db = readDB();
    res.json({ success: true, data: db.permissions });
  });

  app.post("/api/permissions", (req, res) => {
    const { permissions } = req.body; // Map user roles to lists of permissions

    if (!permissions) {
      return res
        .status(400)
        .json({ success: false, error: "Permissions dictionary is required." });
    }

    const db = readDB();
    db.permissions = permissions;
    writeDB(db);

    res.json({
      success: true,
      message: "Permissions updated successfully.",
      data: db.permissions,
    });
  });

  // API Route: Settings Storage (with merged notification properties)
  app.get("/api/settings", (req, res) => {
    const db = readDB();
    const settings = db.settings || {};
    const responsePayload = {
      showLoginInstructions: settings.showLoginInstructions !== false,
      emailNotificationsEnabled: settings.emailNotificationsEnabled !== false,
      notificationEmail: settings.notificationEmail || "rajuhd13@gmail.com",
    };
    res.json({ 
      success: true, 
      data: responsePayload,
      settings: responsePayload
    });
  });

  app.post("/api/settings", (req, res) => {
    const db = readDB();
    if (!db.settings) db.settings = {};

    const { settings, emailNotificationsEnabled, notificationEmail } = req.body;
    
    if (settings && typeof settings === "object") {
      db.settings = { ...db.settings, ...settings };
    }
    
    if (emailNotificationsEnabled !== undefined) {
      db.settings.emailNotificationsEnabled = emailNotificationsEnabled === true;
    }
    
    if (notificationEmail !== undefined) {
      db.settings.notificationEmail = String(notificationEmail).trim();
    }
    
    writeDB(db);

    const mergedSettings = {
      showLoginInstructions: db.settings.showLoginInstructions !== false,
      emailNotificationsEnabled: db.settings.emailNotificationsEnabled !== false,
      notificationEmail: db.settings.notificationEmail || "rajuhd13@gmail.com",
    };

    res.json({
      success: true,
      message: "System settings synchronized successfully.",
      data: mergedSettings,
      settings: mergedSettings
    });
  });

  // API Route: Reports Aggregator for charts (Attendance/Activity summary)
  app.get("/api/reports", (req, res) => {
    try {
      const db = readDB();
      if (!db || !db.workflows) {
        return res.json({
          success: true,
          data: {
            totalWorkflows: 0,
            totalUsers: (db && db.users ? db.users.length : 0),
            totalCampuses: 0,
            userWise: [],
            campusWise: [],
            monthWise: [],
          },
        });
      }

      const flatWorkflows: any[] = [];

      db.workflows.forEach((row: any) => {
        if (!row) return;
        Object.keys(row).forEach((key) => {
          if (/^[A-Z][a-z][a-z]-\d\d$/.test(key)) {
            let entries = [];
            try {
              const rawCell = row[key];
              entries = typeof rawCell === "string" ? JSON.parse(rawCell) : rawCell;
            } catch (e) {
              entries = [];
            }

            if (Array.isArray(entries)) {
              entries.forEach((entry: any) => {
                // Ensure we only process actual work history entries, not responsibility objects
                if (entry && typeof entry === "object" && entry.date) {
                  flatWorkflows.push({
                    name: row.name || "Unknown",
                    pin: row.pin || "N/A",
                    campus: row.campus || "Unknown",
                    monthKey: key,
                    date: entry.date,
                  });
                }
              });
            }
          }
        });
      });

      // 1. User Wise Aggregation
      const userMap: { [name: string]: number } = {};
      flatWorkflows.forEach((w) => {
        userMap[w.name] = (userMap[w.name] || 0) + 1;
      });
      const userWise = Object.keys(userMap)
        .map((name) => ({
          name,
          entriesCount: userMap[name],
        }))
        .sort((a, b) => b.entriesCount - a.entriesCount);

      // 2. Campus Wise Aggregation
      const campusMap: { [campus: string]: number } = {};
      flatWorkflows.forEach((w) => {
        campusMap[w.campus] = (campusMap[w.campus] || 0) + 1;
      });
      const campusWise = Object.keys(campusMap).map((campus) => ({
        campus,
        entriesCount: campusMap[campus],
      }));

      // 3. Monthly Trend Aggregation
      const monthMap: { [month: string]: number } = {};
      flatWorkflows.forEach((w) => {
        monthMap[w.monthKey] = (monthMap[w.monthKey] || 0) + 1;
      });
      const monthWise = Object.keys(monthMap).map((monthKey) => ({
        month: monthKey,
        entriesCount: monthMap[monthKey],
      }));

      res.json({
        success: true,
        data: {
          totalWorkflows: flatWorkflows.length,
          totalUsers: db.users ? db.users.length : 0,
          totalCampuses: db.users ? new Set(db.users.map((u: any) => u.campus)).size : 0,
          userWise,
          campusWise,
          monthWise,
        },
      });
    } catch (err: any) {
      console.error("Reports calculation error:", err);
      res.status(500).json({ success: false, error: "Failed to compile report data." });
    }
  });

  // ================= DEVICE MANAGEMENT API ROUTES =================

  app.get("/api/devices", async (req, res) => {
    const forceSync = req.query.sync === "true";
    const db = readDB();
    
    if (forceSync || (db.devices || []).length === 0) {
      if (db.appscriptUrl) {
        await syncDevicesFromAppsScript(db.appscriptUrl);
        const updatedDB = readDB();
        return res.json({ success: true, data: updatedDB.devices || [], synced: true });
      }
    }
    
    res.json({ success: true, data: db.devices || [], synced: false });
  });

  app.post("/api/devices/sync", async (req, res) => {
    const db = readDB();
    if (!db.appscriptUrl) {
      return res.status(400).json({ success: false, error: "Google Sheets connection not configured." });
    }
    const result = await syncDevicesFromAppsScript(db.appscriptUrl);
    res.json(result);
  });

  app.post("/api/devices", (req, res) => {
    const formData = req.body;
    const db = readDB();
    const lastSl = db.devices.reduce((max: number, d: any) => Math.max(max, d.sl || 0), 0);
    const newRecord = {
      ...formData,
      sl: lastSl + 1,
    };
    db.devices.push(newRecord);
    writeDB(db);

    // Sync to Apps Script
    syncToAppsScript({
      action: "saveNewData",
      formData: formData,
    });

    res.json({ success: true, message: "Device added successfully", data: newRecord });
  });

  app.put("/api/devices/:sl", (req, res) => {
    const sl = Number(req.params.sl);
    const formData = req.body;
    const db = readDB();
    const index = db.devices.findIndex((d: any) => d.sl === sl);

    if (index === -1) {
      return res.status(404).json({ success: false, error: "Device record not found." });
    }

    db.devices[index] = { ...formData, sl };
    writeDB(db);

    // Sync to Apps Script
    syncToAppsScript({
      action: "updateRowData",
      rowIndex: sl + 1, // App Script expects a 1-based index including header
      formData: formData,
    });

    res.json({ success: true, message: "Device updated successfully", data: db.devices[index] });
  });

  app.delete("/api/devices/:sl", (req, res) => {
    const sl = Number(req.params.sl);
    const db = readDB();
    const initialLength = db.devices.length;
    db.devices = db.devices.filter((d: any) => d.sl !== sl);

    if (db.devices.length === initialLength) {
      return res.status(404).json({ success: false, error: "Device record not found." });
    }

    writeDB(db);

    // Sync to Apps Script
    syncToAppsScript({
      action: "deleteDevice",
      rowIndex: sl + 1,
    });

    res.json({ success: true, message: "Device record deleted successfully." });
  });

  app.delete("/api/workflow/history", (req, res) => {
    const { pin, monthKey, entrySl } = req.body;

    if (!pin || !monthKey || !entrySl) {
      return res.status(400).json({
        success: false,
        error: "Missing required workflow properties for deletion.",
      });
    }

    const db = readDB();
    const workflowRow = db.workflows.find((w: any) => String(w.pin) === String(pin));

    if (!workflowRow || !workflowRow[monthKey]) {
      return res.status(404).json({ success: false, error: "Workflow entry not found." });
    }

    let monthEntries: any[] = [];
    try {
      const rawCell = workflowRow[monthKey];
      monthEntries = typeof rawCell === "string" ? JSON.parse(rawCell) : rawCell;
    } catch (e) {
      return res.status(404).json({ success: false, error: "Failed to parse workflow entries." });
    }

    if (!Array.isArray(monthEntries)) {
      return res.status(404).json({ success: false, error: "Invalid workflow entries data structure." });
    }

    const initialLength = monthEntries.length;
    monthEntries = monthEntries.filter((e) => {
      // Keep responsibility object
      if (e && typeof e === "object" && "responsibility" in e) return true;
      // Filter out specific entry SL
      return Number(e.sl) !== Number(entrySl);
    });

    if (monthEntries.length === initialLength) {
      return res.status(404).json({ success: false, error: "Specific workflow entry not found for deletion." });
    }

    workflowRow[monthKey] = JSON.stringify(monthEntries);
    workflowRow.timestamp = new Date().toISOString();
    writeDB(db);

    // Sync to Apps Script
    syncToAppsScript({
      action: "deleteWorkflowEntry",
      pin,
      monthKey,
      entrySl
    });

    return res.json({
      success: true,
      message: "Workflow entry deleted successfully!",
    });
  });

  app.get("/api/devices/summary", (req, res) => {
    const db = readDB();
    const devices = db.devices || [];
    
    // We can provide some pre-calculated summary or just return raw summary if we have it
    // For now, let's calculate based on devices
    const campusSummary: { [key: string]: number } = {};
    devices.forEach((d: any) => {
      campusSummary[d.campusName] = (campusSummary[d.campusName] || 0) + 1;
    });

    // Mocking the summary structure similar to App Script's getSummaryData
    // [["Header1", "Header2", ...], ["Row1Data", ...], ..., ["FooterData", ...]]
    // But since we are full-stack, we can just return structured JSON.
    // However, the provided HTML expects specific summary data.
    // I'll return a simple object and the frontend will format it.
    
    res.json({
      success: true,
      data: campusSummary
    });
  });

  // API Route: Get modern Google Sheets config
  app.get("/api/sheets/config", (req, res) => {
    try {
      const db = readDB();
      res.json({
        success: true,
        appscriptUrl:
          (db && db.appscriptUrl) ||
          "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec",
      });
    } catch (err: any) {
      console.error("[Get Sheets Config Fail] Safe fallback applied:", err);
      res.json({
        success: true,
        appscriptUrl: "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec",
      });
    }
  });

  // API Route: Save updated Google Sheets config
  app.post("/api/sheets/config", (req, res) => {
    const { appscriptUrl } = req.body;
    const db = readDB();
    db.appscriptUrl = String(appscriptUrl || "").trim();
    writeDB(db);
    res.json({
      success: true,
      message: "Apps Script Deployment URL updated successfully!",
    });
  });

  // API Route: Send Test Email
  app.post("/api/settings/test-email", async (req, res) => {
    try {
      const db = readDB();
      const { emailNotificationsEnabled, notificationEmail } = req.body;
      const url =
        db.appscriptUrl ||
        "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec";
      
      if (!url) {
        return res.status(400).json({ success: false, error: "Google Sheets connection URL not configured." });
      }

      const appUrl = process.env.APP_URL || `https://${req.get("host")}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "testEmail",
          emailNotificationsEnabled: emailNotificationsEnabled !== false,
          notificationEmail: notificationEmail || "rajuhd13@gmail.com",
          userName: "WMS Administrator",
          appUrl
        })
      });
      
      const resVal = await response.json();
      if (resVal.success) {
        res.json({ success: true, message: `Test notification successfully dispatched to ${notificationEmail || "rajuhd13@gmail.com"}!` });
      } else {
        res.status(400).json({ success: false, error: resVal.error || "Google Sheets Apps Script returned failing status." });
      }
    } catch (err: any) {
      console.error("Test email connection trigger failure:", err);
      res.status(500).json({ success: false, error: "Test email dispatch timed out or failed: " + (err.message || String(err)) });
    }
  });

  // API Route: Direct force-push bulk local dataset into Google Sheets
  app.post("/api/sheets/sync-all", async (req, res) => {
    try {
      const db = readDB();
      const url =
        db.appscriptUrl ||
        "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec";
      if (!url) {
        return res.status(400).json({
          success: false,
          error: "Apps Script Deployment URL is not initialized or invalid.",
        });
      }

      // Step 1: Sync Users List sequentially
      let userSuccessCount = 0;
      for (const u of db.users) {
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "addUser",
              pin: u.pin,
              name: u.name,
              role: u.role,
              campus: u.campus,
              status: u.status,
            }),
          });
          const b = await resp.json();
          if (b.success) userSuccessCount++;
        } catch (err: any) {
          console.warn(`User PIN ${u.pin} sync warning:`, err.message || err);
        }
      }

      // Step 2: Extract flattened workflows list to feed sheet inputs
      const flatWorkflows: any[] = [];
      db.workflows.forEach((row: any) => {
        Object.keys(row).forEach((key) => {
          if (/^[A-Z][a-z][a-z]-\d\d$/.test(key)) {
            let entries = [];
            try {
              const rawCell = row[key];
              entries =
                typeof rawCell === "string" ? JSON.parse(rawCell) : rawCell;
            } catch (e) {
              entries = [];
            }

            if (Array.isArray(entries)) {
              entries.forEach((entry: any) => {
                flatWorkflows.push({
                  pin: row.pin,
                  date: entry.date,
                  workHistory: entry.workHistory,
                  responsibility: row.responsibility || "",
                });
              });
            }
          }
        });
      });

      // Step 3: Trigger sequential workflow submissions
      let workflowSuccessCount = 0;
      for (const wf of flatWorkflows) {
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "submitWorkflow",
              pin: wf.pin,
              date: wf.date,
              workHistory: wf.workHistory,
              responsibility: wf.responsibility,
            }),
          });
          const b = await resp.json();
          if (b.success) workflowSuccessCount++;
        } catch (err: any) {
          console.warn("Workflow item sync warning:", err.message || err);
        }
      }

      res.json({
        success: true,
        message: `Bulk Spreadsheet synchronization complete! Synchronized ${userSuccessCount} users and ${workflowSuccessCount} workflow activity rows.`,
        usersSynced: userSuccessCount,
        workflowsSynced: workflowSuccessCount,
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({
        success: false,
        error: err.message || "Bulk transmission failed.",
      });
    }
  });

  // Serve static assets in production or mount Vite middleware in development
  if (process.env.NODE_ENV !== "production" && !isVercel) {
    const { createServer: cvs } = await import("vite");
    const vite = await cvs({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: any, res: any) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ success: false, error: "Not Found", details: "Client assets are unavailable in serverless mode." });
      }
    });
  }

  return app;
}

const appPromise = startServer();

export default async function (req: any, res: any) {
  try {
    // Reconstruct URL before Express receives it (Critical for Vercel Serverless routing)
    const originalUrl = req.url || "";
    if (originalUrl) {
      try {
        const urlObj = new URL(originalUrl, "http://localhost");
        const origPathQuery = urlObj.searchParams.get("_original_path") || (req.query && req.query._original_path);
        const matchedPathHeader = req.headers["x-matched-path"];

        if (origPathQuery) {
          const pathStr = Array.isArray(origPathQuery) ? origPathQuery.join("/") : String(origPathQuery);
          urlObj.searchParams.delete("_original_path");
          urlObj.pathname = "/api/" + pathStr.replace(/^\/+/, "");
          req.url = urlObj.pathname + urlObj.search;
          
          req.query = req.query || {};
          delete req.query._original_path;
          urlObj.searchParams.forEach((val: any, key: any) => {
            req.query[key] = val;
          });
          console.log(`[Vercel Serverless Pre-Fixer] Reconstructed query match: ${originalUrl} -> ${req.url}`);
        } else if (matchedPathHeader && String(matchedPathHeader) !== "/api/index") {
          const matchedPathStr = String(matchedPathHeader);
          urlObj.pathname = matchedPathStr;
          req.url = urlObj.pathname + urlObj.search;
          console.log(`[Vercel Serverless Pre-Fixer] Reconstructed header match: ${originalUrl} -> ${req.url}`);
        } else if (req.url.startsWith("/api/index")) {
          // Keep as is
        } else if (!req.url.startsWith("/api")) {
          const separator = req.url.startsWith("/") ? "" : "/";
          req.url = "/api" + separator + req.url;
          console.log(`[Vercel Serverless Pre-Fixer] Prepended /api path: ${originalUrl} -> ${req.url}`);
        }

        // Force Express to flush its parsed URL caches
        try { delete req._parsedUrl; } catch (e) {}
        try { delete req._parsedUrlSelf; } catch (e) {}
        try { delete req.path; } catch (e) {}
        try { delete req._path; } catch (e) {}
      } catch (err) {
        console.warn("[Vercel Serverless Pre-Fixer] Routing reconstruction error ignored:", err);
      }
    }

    const app = await appPromise;
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Error:", err);
    res.status(500).json({ success: false, error: "Cloud function crashed.", details: err.message });
  }
}

// Start local listener only if not running in a serverless environment like Vercel
if (process.env.VERCEL !== "1") {
  appPromise.then((app) => {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server fully listening on http://0.0.0.0:${PORT}`);

      // Background dynamic sync from Google Sheets on start
      const startDb = readDB();
      const url = startDb.appscriptUrl;
      if (url) {
        console.log(
          "Triggering start-up background synchronisation with Google Sheets...",
        );
        Promise.all([
          syncUsersFromAppsScript(url),
          syncWorkflowsFromAppsScript(url),
          syncDevicesFromAppsScript(url),
        ])
          .then(() => {
            console.log("Start-up Google Sheets data synchronization completed.");
          })
          .catch((err) => {
            console.warn(
              "Start-up Google Sheets data synchronization bypassed:",
              err,
            );
          });
      }
    });
  });
}
