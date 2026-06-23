import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, FlatWorkflowRecord } from "../types";
import { safeSessionStorage } from "../storage";
import { 
  Calendar, 
  CheckCircle2, 
  HelpCircle, 
  Save, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  UserCheck, 
  Search, 
  Briefcase,
  FileText,
  Download,
  Copy,
  ChevronDown,
  Check,
  Eye,
  X
} from "lucide-react";

interface MemberResponsibilityProps {
  currentUser: User;
}

interface MonthOption {
  key: string;
  label: string;
  monthIndex: number;
  year: number;
}

export default function MemberResponsibility({ currentUser }: MemberResponsibilityProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<FlatWorkflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Month selector keys (dynamically parsed from history sheet data)
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);

  // Default to current month key (e.g., Jun-26)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    const mName = months[today.getMonth()];
    const yShort = String(today.getFullYear()).slice(-2);
    return `${mName}-${yShort}`;
  });

  // State to track temporary responsibility inputs by user PIN
  const [localResponsibilities, setLocalResponsibilities] = useState<{ [pin: string]: string }>({});
  const [isSaving, setIsSaving] = useState<{ [pin: string]: boolean }>({});
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string; pin?: string } | null>(null);

  // States for export and copy features
  const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  // Member Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);

  const loadData = async (background = true) => {
    if (!background) {
      const cachedUsers = safeSessionStorage.getItem("wms_cache_users_active");
      const cachedHistory = safeSessionStorage.getItem("wms_cache_history");
      const cachedResp = safeSessionStorage.getItem(`wms_cache_resp_${selectedMonth}`);
      
      if (cachedUsers && cachedHistory) {
        setUsers(JSON.parse(cachedUsers));
        setHistory(JSON.parse(cachedHistory));
        buildMonthOptions(JSON.parse(cachedHistory));
        
        if (cachedResp) {
          setLocalResponsibilities(JSON.parse(cachedResp));
        }
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }

    try {
      // 1. Fetch Users
      const usersRes = await fetch("/api/users");
      if (!usersRes.ok) throw new Error(`Users fetch failed (${usersRes.status})`);
      const usersData = await usersRes.json();
      const activeUsers = (usersData.data || usersData || []).filter((u: User) => u.status === "Active");
      setUsers(activeUsers);
      safeSessionStorage.setItem("wms_cache_users_active", JSON.stringify(activeUsers));

      // 2. Fetch Workflow History
      const logsRes = await fetch("/api/workflow/history");
      if (!logsRes.ok) throw new Error(`Logs fetch failed (${logsRes.status})`);
      const logsData = await logsRes.json();
      const historyList: FlatWorkflowRecord[] = (logsData.data || logsData || []);
      setHistory(historyList);
      safeSessionStorage.setItem("wms_cache_history", JSON.stringify(historyList));

      buildMonthOptions(historyList);

      // 3. Fetch monthly-wise Responsibility entries
      const respRes = await fetch(`/api/workflow/responsibility?monthKey=${selectedMonth}`);
      if (!respRes.ok) throw new Error(`Responsibility fetch failed (${respRes.status})`);
      const respData = await respRes.json();
      
      if (respData.success && respData.data) {
        const respMap: { [pin: string]: string } = {};
        respData.data.forEach((item: any) => {
          respMap[item.pin] = item.responsibility || "";
        });
        setLocalResponsibilities(respMap);
        safeSessionStorage.setItem(`wms_cache_resp_${selectedMonth}`, JSON.stringify(respMap));
      }
    } catch (err) {
      console.error("Failed to fetch Member Responsibility dataset:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const buildMonthOptions = (historyList: FlatWorkflowRecord[]) => {
    // Extract unique monthKey options dynamically from history
    const uniqueKeys = Array.from(new Set(historyList.map(h => h.monthKey).filter(Boolean)));
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    const curMonthKey = `${months[today.getMonth()]}-${String(today.getFullYear()).slice(-2)}`;
    
    if (!uniqueKeys.includes(curMonthKey)) {
      uniqueKeys.push(curMonthKey);
    }

    const options: MonthOption[] = [];
    uniqueKeys.forEach(k => {
      const parts = k.split("-");
      if (parts.length < 2) return;
      const mStr = parts[0];
      const yStr = parts[1];
      const year = 2000 + parseInt(yStr, 10);
      const monthIndex = months.indexOf(mStr);
      if (monthIndex === -1) return;
      const fullMonths = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      options.push({
        key: k,
        label: `${fullMonths[monthIndex]} ${year}`,
        monthIndex,
        year
      });
    });

    options.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });

    setMonthOptions(options);
  };

  useEffect(() => {
    loadData(false);
  }, [selectedMonth]);

  const handleSaveResponsibility = async (pin: string) => {
    const value = localResponsibilities[pin] || "";
    setIsSaving(prev => ({ ...prev, [pin]: true }));
    setActionMessage(null);

    try {
      const res = await fetch("/api/workflow/responsibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          monthKey: selectedMonth,
          responsibility: value.trim()
        })
      });

      const body = await res.json();
      if (body.success) {
        setActionMessage({
          type: "success",
          text: "Saved!",
          pin
        });
        // Auto reload log history to reflect updated values
        const logsRes = await fetch("/api/workflow/history");
        const logsData = await logsRes.json();
        setHistory(logsData.data || []);

        // Also reload responsibilities in the background so they auto-load and display immediately
        loadData(true);
      } else {
        setActionMessage({
          type: "error",
          text: body.error || "Failed",
          pin
        });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: "Error",
        pin
      });
    } finally {
      setIsSaving(prev => ({ ...prev, [pin]: false }));
    }
  };

  // Export table to Excel (CSV format that Excel opens perfectly with BOM and custom cells)
  const exportToExcel = () => {
    // Generate headers
    const headers = [
      "SL",
      "Name",
      "PIN",
      "Campus",
      ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`),
      "Monthly Wish Responsibility"
    ];
    
    // Generate rows
    const rows = filteredUsers.map((user, idx) => {
      const rowData = [
        String(idx + 1),
        user.name,
        `'${user.pin}`, // Prepend single quote to force Excel to treat PIN as a string (keeps leading zeros)
        user.campus
      ];
      
      // Day 1 to Day 31 work history logs
      for (let dayNum = 1; dayNum <= 31; dayNum++) {
        const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
        const mOpt = monthOptions.find(o => o.key === selectedMonth) || monthOptions[0];
        let dayLogsStr = "";
        if (mOpt) {
          const monthStr = (mOpt.monthIndex + 1) < 10 ? `0${mOpt.monthIndex + 1}` : `${mOpt.monthIndex + 1}`;
          const dateStr = `${mOpt.year}-${monthStr}-${formattedDay}`;
          const matchedLogs = history.filter(
            (log) => String(log.pin) === String(user.pin) && 
                     log.monthKey === selectedMonth && 
                     log.date === dateStr
          );
          dayLogsStr = matchedLogs.map(l => l.workHistory).join("; ");
        }
        rowData.push(dayLogsStr);
      }
      
      // Monthly Wish Responsibility
      rowData.push(localResponsibilities[String(user.pin)] || "");
      return rowData;
    });
    
    // Format as CSV
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map(row => row.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");
    
    // Create download link with BOM for Excel Bengali Unicode support
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Member_Responsibility_${selectedMonth}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show copy status momentarily as download indicator
    setCopyStatus("XLSX CSV file downloaded successfully!");
    setTimeout(() => setCopyStatus(""), 3000);
  };

  // Copy table with headers
  const copyWithHeaders = () => {
    const headers = [
      "SL",
      "Name",
      "PIN",
      "Campus",
      ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`),
      "Monthly Wish Responsibility"
    ];
    
    const rows = filteredUsers.map((user, idx) => {
      const rowData = [
        String(idx + 1),
        user.name,
        user.pin,
        user.campus
      ];
      
      for (let dayNum = 1; dayNum <= 31; dayNum++) {
        const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
        const mOpt = monthOptions.find(o => o.key === selectedMonth) || monthOptions[0];
        let dayLogsStr = "";
        if (mOpt) {
          const monthStr = (mOpt.monthIndex + 1) < 10 ? `0${mOpt.monthIndex + 1}` : `${mOpt.monthIndex + 1}`;
          const dateStr = `${mOpt.year}-${monthStr}-${formattedDay}`;
          const matchedLogs = history.filter(
            (log) => String(log.pin) === String(user.pin) && 
                     log.monthKey === selectedMonth && 
                     log.date === dateStr
          );
          dayLogsStr = matchedLogs.map(l => l.workHistory).join("; ");
        }
        rowData.push(dayLogsStr);
      }
      
      rowData.push(localResponsibilities[String(user.pin)] || "");
      return rowData.join("\t");
    });
    
    const finalClipboardText = [headers.join("\t"), ...rows].join("\n");
    navigator.clipboard.writeText(finalClipboardText);
    setCopyStatus("টেবিল সফলভাবে হেডার সহ কপি করা হয়েছে ! (Table copied with headers!)");
    setTimeout(() => setCopyStatus(""), 4000);
  };

  // Copy table without headers
  const copyWithoutHeaders = () => {
    const rows = filteredUsers.map((user, idx) => {
      const rowData = [
        String(idx + 1),
        user.name,
        user.pin,
        user.campus
      ];
      
      for (let dayNum = 1; dayNum <= 31; dayNum++) {
        const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
        const mOpt = monthOptions.find(o => o.key === selectedMonth) || monthOptions[0];
        let dayLogsStr = "";
        if (mOpt) {
          const monthStr = (mOpt.monthIndex + 1) < 10 ? `0${mOpt.monthIndex + 1}` : `${mOpt.monthIndex + 1}`;
          const dateStr = `${mOpt.year}-${monthStr}-${formattedDay}`;
          const matchedLogs = history.filter(
            (log) => String(log.pin) === String(user.pin) && 
                     log.monthKey === selectedMonth && 
                     log.date === dateStr
          );
          dayLogsStr = matchedLogs.map(l => l.workHistory).join("; ");
        }
        rowData.push(dayLogsStr);
      }
      
      rowData.push(localResponsibilities[String(user.pin)] || "");
      return rowData.join("\t");
    });
    
    const finalClipboardText = rows.join("\n");
    navigator.clipboard.writeText(finalClipboardText);
    setCopyStatus("টেবিল সফলভাবে হেডার ছাড়া কপি করা হয়েছে ! (Table copied without headers!)");
    setTimeout(() => setCopyStatus(""), 4000);
  };

  // Extract selected month metrics
  const monthOpt = monthOptions.find(o => o.key === selectedMonth) || monthOptions[0];

  const openProfileModal = (user: User) => {
    setSelectedUserForProfile(user);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedUserForProfile(null);
  };

  const getWorkingDays = (logs: FlatWorkflowRecord[]) => {
    const uniqueDays = new Set(logs.map(l => l.date));
    return uniqueDays.size;
  };

  // Filter matched users on search query
  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.campus.toLowerCase().includes(term) ||
      u.pin.includes(term)
    );
  });

  // Always generate exactly 31 days to comply strictly with the column specification
  const daysArray = Array.from({ length: 31 }, (_, index) => index + 1);

  return (
    <div className="space-y-3">
      
      {/* Control panel & filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          
          {/* Search Bar query */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search member name, campus, PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-1 focus:ring-emerald-600 transition-all text-xs font-medium"
            />
          </div>

          {/* Month selector dropdown */}
          <div className="flex items-center space-x-2 w-full md:w-auto self-end md:self-auto justify-end">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label} ({opt.key})
                </option>
              ))}
            </select>

            <button
              onClick={loadData}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reload Logs</span>
            </button>

            {/* XLSX Download Button */}
            <button
              onClick={exportToExcel}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all shrink-0 shadow-sm inline-flex items-center"
              title="Download table to Excel"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>xlsx</span>
            </button>

            {/* Copy Dropdown Trigger Button */}
            <div className="relative shrink-0 z-30">
              <button
                onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-all inline-flex items-center"
                title="Copy table data"
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                <span>Copy</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
              </button>

              {isCopyDropdownOpen && (
                <>
                  {/* Backdrop overlay */}
                  <div 
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsCopyDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 py-1.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-100">
                    <button
                      onClick={() => {
                        copyWithHeaders();
                        setIsCopyDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center space-x-2 transition-colors border-b border-slate-100 dark:border-slate-800"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                      <span>With Headers (হেডার সহ)</span>
                    </button>
                    <button
                      onClick={() => {
                        copyWithoutHeaders();
                        setIsCopyDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center space-x-2 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                      <span>Without Headers (হেডার ছাড়া)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Dynamic Action Response message outside table */}
        {actionMessage && !actionMessage.pin && (
          <div className={`p-2 rounded-lg flex items-center space-x-1.5 text-xs font-semibold ${
            actionMessage.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
          }`}>
            {actionMessage.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Main Table details with Horizontal Scrolling and Max Height support */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-slate-500 text-xs font-medium">Loading members list and presence sheets...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <UserCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-400">No active members found matching current query filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full max-h-[420px] overflow-y-auto relative">
            <table className="min-w-[4000px] text-left border-collapse table-fixed">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(30,41,59,1)]">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-2 px-2 w-[50px] text-center font-semibold bg-slate-50 dark:bg-slate-950">SL</th>
                  <th className="py-2 px-2 w-[220px] font-semibold bg-slate-50 dark:bg-slate-950">Name & Details</th>
                  <th className="py-2 px-2 w-[90px] text-center font-semibold bg-slate-50 dark:bg-slate-950">PIN</th>
                  <th className="py-2 px-2 w-[160px] font-semibold bg-slate-50 dark:bg-slate-950">Campus</th>
                  
                  {/* Generate 31 Column Headers */}
                  {daysArray.map((dayNum) => (
                    <th 
                      key={dayNum} 
                      className="py-2 px-1.5 w-[110px] text-center border-l border-slate-200 dark:border-slate-800 font-extrabold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 text-xs"
                    >
                      Day {dayNum}
                    </th>
                  ))}

                  <th className="py-2 px-2 w-[260px] border-l border-slate-200 dark:border-slate-800 font-semibold bg-slate-50 dark:bg-slate-950">Monthly Wish Responsibility</th>
                  <th className="py-2 px-2 w-[80px] text-center font-semibold bg-slate-50 dark:bg-slate-950">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {filteredUsers.map((user, idx) => {
                  // Get and parse this user's logs in selected month
                  const userMonthLogs = history.filter(
                    (item) => String(item.pin) === String(user.pin) && item.monthKey === selectedMonth
                  );

                  const textPin = String(user.pin);

                  return (
                    <tr key={user.pin} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/25 transition-colors align-top">
                      {/* SL index with Eye icon */}
                      <td className="py-1 px-2 text-center font-bold text-slate-400">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button 
                            onClick={() => openProfileModal(user)}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                            title="View member details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <span>{idx + 1}</span>
                        </div>
                      </td>

                      {/* Name Details */}
                      <td className="py-1 px-2 font-semibold">
                        <div className="text-slate-900 dark:text-white font-bold text-xs">{user.name}</div>
                      </td>

                      {/* Display Pin */}
                      <td className="py-1 px-2 text-center font-mono font-semibold text-slate-500">
                        {user.pin}
                      </td>

                      {/* Campus Location */}
                      <td className="py-1 px-2 font-medium text-slate-600 dark:text-slate-300 truncate">
                        {user.campus}
                      </td>

                      {/* 1 To 31 Days columns rendering actual work history */}
                      {daysArray.map((dayNum) => {
                        const mOpt = monthOptions.find(o => o.key === selectedMonth) || monthOptions[0];
                        if (!mOpt) {
                          return (
                            <td key={dayNum} className="py-1 px-1 border-l border-slate-200 dark:border-slate-800 text-center">—</td>
                          );
                        }
                        const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                        const monthStr = (mOpt.monthIndex + 1) < 10 ? `0${mOpt.monthIndex + 1}` : `${mOpt.monthIndex + 1}`;
                        const dateStr = `${mOpt.year}-${monthStr}-${formattedDay}`;

                        // Find logs matching this exact date
                        const matchedLogs = userMonthLogs.filter(h => h.date === dateStr);
                        const hasLogs = matchedLogs.length > 0;

                        return (
                          <td 
                            key={dayNum} 
                            className={`py-1 px-1 border-l border-slate-200 dark:border-slate-800 align-top transition-colors ${
                              hasLogs 
                                ? "bg-emerald-500/5 dark:bg-emerald-500/10 text-slate-800 dark:text-slate-100" 
                                : "text-slate-400 dark:text-slate-600"
                            }`}
                          >
                            {hasLogs ? (
                              <div className="space-y-1">
                                {matchedLogs.map((log, lIdx) => (
                                  <div 
                                    key={lIdx} 
                                    className="bg-emerald-500/10 dark:bg-emerald-500/20 text-[10px] leading-snug p-1 rounded border border-emerald-500/15 shadow-sm whitespace-normal break-words font-medium"
                                    title={`Log Entry: ${log.workHistory}`}
                                  >
                                    {log.workHistory}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center text-[9px] italic py-1 text-slate-300 dark:text-slate-700">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Responsibility monthly-specific inputs field */}
                      <td className="py-1 px-1.5 border-l border-slate-200 dark:border-slate-800">
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Enter responsibility status..."
                            value={localResponsibilities[textPin] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLocalResponsibilities(prev => ({
                                ...prev,
                                ...{ [textPin]: val }
                              }));
                            }}
                            className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-1 focus:ring-emerald-600 transition-all font-medium text-[11px] text-slate-800 dark:text-slate-100"
                          />
                          {actionMessage && actionMessage.pin === textPin && (
                            <p className={`text-[9px] font-semibold ${
                              actionMessage.type === "success" ? "text-emerald-500 animate-pulse" : "text-rose-500"
                            }`}>
                              {actionMessage.text}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Trigger Actions */}
                      <td className="py-1 px-1 text-center">
                        <button
                          onClick={() => handleSaveResponsibility(textPin)}
                          disabled={isSaving[textPin]}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] select-none shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving[textPin] ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Save className="w-2.5 h-2.5" />
                          )}
                          <span>Save</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {copyStatus && (
        <div className="fixed bottom-4 right-4 z-50 p-3 rounded-lg text-xs bg-slate-900 border border-slate-700 dark:bg-white dark:border-slate-200 text-white dark:text-slate-900 flex items-center space-x-2 font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{copyStatus}</span>
        </div>
      )}

      {/* Member Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && selectedUserForProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProfileModal}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  Member Working Details
                </h3>
                <button
                  onClick={closeProfileModal}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* User Info Grid Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
                        <th className="border border-slate-200 dark:border-slate-800 py-2 px-3 text-left font-bold">Month Name</th>
                        <th className="border border-slate-200 dark:border-slate-800 py-2 px-3 text-left font-bold">Name & Details</th>
                        <th className="border border-slate-200 dark:border-slate-800 py-2 px-3 text-center font-bold">PIN</th>
                        <th className="border border-slate-200 dark:border-slate-800 py-2 px-3 text-left font-bold">Campus</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-slate-900 dark:text-slate-100 uppercase tracking-tight font-medium">
                        <td className="border border-slate-200 dark:border-slate-800 py-2.5 px-3 italic text-emerald-600 dark:text-emerald-400 font-bold">
                          {monthOpt?.label || selectedMonth}
                        </td>
                        <td className="border border-slate-200 dark:border-slate-800 py-2.5 px-3 font-bold">
                          {selectedUserForProfile.name}
                        </td>
                        <td className="border border-slate-200 dark:border-slate-800 py-2.5 px-3 text-center font-mono">
                          {selectedUserForProfile.pin}
                        </td>
                        <td className="border border-slate-200 dark:border-slate-800 py-2.5 px-3">
                          {selectedUserForProfile.campus}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Work History Logs Table (3 Columns) */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
                        {[1, 2, 3].map(col => (
                          <React.Fragment key={col}>
                            <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-left font-bold uppercase w-[60px]">Date</th>
                            <th className="border border-slate-200 dark:border-slate-800 py-2 px-2 text-left font-bold uppercase w-[27%]">Work History</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Rows for Day 1-10, 11-20, 21-30 */}
                      {Array.from({ length: 10 }).map((_, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-slate-100 dark:border-slate-800/50">
                          {[1, 11, 21].map(startDay => {
                            const dayNum = rowIdx + startDay;
                            const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                            const monthIndex = monthOpt?.monthIndex ?? 0;
                            const year = monthOpt?.year ?? 2026;
                            const monthStr = (monthIndex + 1) < 10 ? `0${monthIndex + 1}` : `${monthIndex + 1}`;
                            const dateStr = `${year}-${monthStr}-${formattedDay}`;

                            const matchedLogs = history.filter(
                              (log) => String(log.pin) === String(selectedUserForProfile.pin) && 
                                       log.monthKey === selectedMonth && 
                                       log.date === dateStr
                            );
                            const hasLogs = matchedLogs.length > 0;

                            return (
                              <React.Fragment key={startDay}>
                                <td className="border border-slate-200 dark:border-slate-800 py-1.5 px-2 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/30 dark:bg-slate-800/20 w-[60px]">
                                  Day {dayNum}
                                </td>
                                <td className={`border border-slate-200 dark:border-slate-800 py-1.5 px-2 align-top w-[27%] ${hasLogs ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-300 dark:text-slate-700 italic text-[10px]"}`}>
                                  {hasLogs ? matchedLogs.map(l => l.workHistory).join("; ") : ""}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                      
                      {/* Final Row: Working Days Summary and Day 31 */}
                      <tr className="bg-slate-50/50 dark:bg-slate-950/40 font-bold border-t-2 border-slate-200 dark:border-slate-800">
                        <td colSpan={4} className="border border-slate-200 dark:border-slate-800 py-2 px-3 text-center">
                          <span className="text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300 mr-2">Working Days:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                            {getWorkingDays(history.filter(log => String(log.pin) === String(selectedUserForProfile.pin) && log.monthKey === selectedMonth))}
                          </span>
                        </td>
                        <td className="border border-slate-200 dark:border-slate-800 py-1.5 px-2 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/30 dark:bg-slate-800/20 w-[60px]">
                          Day 31
                        </td>
                        <td className="border border-slate-200 dark:border-slate-800 py-1.5 px-2 align-top w-[27%]">
                          {(() => {
                            const dateStr = `${monthOpt?.year ?? 2026}-${((monthOpt?.monthIndex ?? 0) + 1) < 10 ? '0' : ''}${(monthOpt?.monthIndex ?? 0) + 1}-31`;
                            const matchedLogs = history.filter(
                              (log) => String(log.pin) === String(selectedUserForProfile.pin) && 
                                       log.monthKey === selectedMonth && 
                                       log.date === dateStr
                            );
                            return matchedLogs.length > 0 ? matchedLogs.map(l => l.workHistory).join("; ") : "";
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Monthly Wish Responsibility Section */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                   <div className="bg-slate-50 dark:bg-slate-950 px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                     Monthly Wish Responsibility
                   </div>
                   <div className="flex bg-white dark:bg-slate-900 h-24">
                      <div className="flex-1 p-3">
                        <textarea
                          placeholder="Input box"
                          value={localResponsibilities[selectedUserForProfile.pin] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalResponsibilities(prev => ({
                              ...prev,
                              ...{ [selectedUserForProfile.pin]: val }
                            }));
                          }}
                          className="w-full h-full resize-none border-none outline-none text-slate-800 dark:text-slate-100 bg-transparent text-sm placeholder:text-slate-300 dark:placeholder:text-slate-700"
                        />
                      </div>
                      <div className="w-32 border-l border-slate-200 dark:border-slate-800 flex items-center justify-center p-3">
                         <button
                           onClick={() => handleSaveResponsibility(selectedUserForProfile.pin)}
                           disabled={isSaving[selectedUserForProfile.pin]}
                           className="w-full h-full rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
                         >
                            {isSaving[selectedUserForProfile.pin] ? (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                            ) : (
                              <span>Save</span>
                            )}
                         </button>
                      </div>
                   </div>
                </div>
              </div>

              {/* Action Toast inside Modal */}
              <AnimatePresence>
                {actionMessage && actionMessage.pin === selectedUserForProfile.pin && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2 z-50"
                  >
                    {actionMessage.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                    {actionMessage.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
