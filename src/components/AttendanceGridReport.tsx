import React, { useState, useEffect } from "react";
import { User, FlatWorkflowRecord } from "../types";
import { safeSessionStorage } from "../storage";
import { 
  Users, 
  Calendar, 
  Search, 
  RefreshCw, 
  Download, 
  Copy, 
  ChevronDown, 
  Check,
  FileText,
  Clock,
  MapPin
} from "lucide-react";

interface AttendanceGridReportProps {
  currentUser: User;
}

interface MonthOption {
  key: string;
  label: string;
  monthIndex: number;
  year: number;
}

export default function AttendanceGridReport({ currentUser }: AttendanceGridReportProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<FlatWorkflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("All");

  // State for Dynamic Month options
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  
  // Default to current month key (e.g. Jun-26)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    const mName = months[today.getMonth()];
    const yShort = String(today.getFullYear()).slice(-2);
    return `${mName}-${yShort}`;
  });

  // State for copy/download action alerts
  const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const loadData = async (background = true) => {
    // If not reloading in background, check cache first to render fast
    if (!background) {
      const cachedUsers = safeSessionStorage.getItem("wms_cache_users_active");
      const cachedHistory = safeSessionStorage.getItem("wms_cache_history");
      if (cachedUsers && cachedHistory) {
        setUsers(JSON.parse(cachedUsers));
        setHistory(JSON.parse(cachedHistory));
        buildMonthOptions(JSON.parse(cachedHistory));
        setIsLoading(false);
        // Continue to fetch in background to sync
      } else {
        setIsLoading(true);
      }
    } else {
      // If manually triggering refresh, show some visual cue if needed
    }

    try {
      // 1. Fetch Users
      const usersRes = await fetch("/api/users");
      const usersData = await usersRes.json();
      const activeUsers = (usersData.data || []).filter((u: User) => u.status === "Active");
      setUsers(activeUsers);
      safeSessionStorage.setItem("wms_cache_users_active", JSON.stringify(activeUsers));

      // 2. Fetch Workflows
      const logsRes = await fetch("/api/workflow/history");
      const logsData = await logsRes.json();
      const historyList: FlatWorkflowRecord[] = logsData.data || [];
      setHistory(historyList);
      safeSessionStorage.setItem("wms_cache_history", JSON.stringify(historyList));

      buildMonthOptions(historyList);
    } catch (err) {
      console.error("Failed to fetch information for Attendance Report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const buildMonthOptions = (historyList: FlatWorkflowRecord[]) => {
    // Generate dynamic months option list
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

  const activeMonthOpt = monthOptions.find(o => o.key === selectedMonth) || monthOptions[0];

  const getAttendanceStatus = (userPin: string, dayNum: number): { status: "P" | "A" | "W" | "-" | ""; dateStr: string } => {
    const mOpt = activeMonthOpt;
    if (!mOpt) return { status: "", dateStr: "" };
    
    // Check total days in that specific month
    const daysInMonth = new Date(mOpt.year, mOpt.monthIndex + 1, 0).getDate();
    if (dayNum > daysInMonth) {
      return { status: "", dateStr: "" }; // Leave cells for non-existing dates empty
    }

    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const monthStr = (mOpt.monthIndex + 1) < 10 ? `0${mOpt.monthIndex + 1}` : `${mOpt.monthIndex + 1}`;
    const dateStr = `${mOpt.year}-${monthStr}-${formattedDay}`;

    // 1. Look for logged data in workflow history
    const hasLog = history.some(
      (log) => String(log.pin) === String(userPin) && 
               log.monthKey === selectedMonth && 
               log.date === dateStr
    );

    if (hasLog) {
      return { status: "P", dateStr };
    }

    // 2. Identify Future Dates
    const today = new Date();
    // Set to midnight for accurate comparison
    today.setHours(0, 0, 0, 0); 
    const dateObj = new Date(mOpt.year, mOpt.monthIndex, dayNum);
    
    if (dateObj > today) {
      return { status: "-", dateStr };
    }

    // 3. Identify Weekends (Only Friday)
    const dayOfWeek = dateObj.getDay(); // 5 = Friday
    const isWeekend = dayOfWeek === 5;

    if (isWeekend) {
      return { status: "W", dateStr };
    }

    return { status: "A", dateStr };
  };

  // Filter campuses from unique values in active users
  const uniqueCampuses = Array.from(new Set(users.map(u => u.campus).filter(Boolean)));

  // Filtered profiles
  const filteredUsers = users.filter((u) => {
    const matchSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      String(u.pin).includes(searchQuery) || 
      u.campus.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchCampus = selectedCampus === "All" || u.campus === selectedCampus;

    return matchSearch && matchCampus;
  });

  // Export grid to CSV/XLSX
  const handleExportCSV = () => {
    const headers = [
      "SL",
      "Name & Details",
      "PIN",
      "Campus",
      ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`)
    ];

    const rows = filteredUsers.map((user, idx) => {
      const rowData = [
        String(idx + 1),
        user.name,
        `'${user.pin}`, // Prepend quote so excel preserves leading zeros
        user.campus
      ];

      for (let dayNum = 1; dayNum <= 31; dayNum++) {
        const { status } = getAttendanceStatus(user.pin, dayNum);
        rowData.push(status);
      }

      return rowData;
    });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map(row => row.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_Report_${selectedMonth}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopyStatus("Attendance report downloaded successfully!");
    setTimeout(() => setCopyStatus(""), 3000);
  };

  // Copy table to clipboard helper
  const handleCopyToClipboard = (withHeaders: boolean) => {
    const headers = [
      "SL",
      "Name & Details",
      "PIN",
      "Campus",
      ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`)
    ];

    const rows = filteredUsers.map((user, idx) => {
      const rowData = [
        String(idx + 1),
        user.name,
        user.pin,
        user.campus
      ];

      for (let dayNum = 1; dayNum <= 31; dayNum++) {
        const { status } = getAttendanceStatus(user.pin, dayNum);
        rowData.push(status || "");
      }

      return rowData.join("\t");
    });

    const finalClipboardText = withHeaders 
      ? [headers.join("\t"), ...rows].join("\n") 
      : rows.join("\n");

    navigator.clipboard.writeText(finalClipboardText);
    setCopyStatus(withHeaders ? "copied with headers!" : "copied without headers!");
    setTimeout(() => setCopyStatus(""), 3000);
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center space-y-2">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-slate-500 text-xs font-semibold">Loading Attendance Matrix...</p>
      </div>
    );
  }

  // Calculate quick metrics for overall overview dashboard metrics
  let totalPresentCount = 0;
  let totalAbsentCount = 0;
  let totalWeekendCount = 0;

  filteredUsers.forEach(user => {
    for (let day = 1; day <= 31; day++) {
      const { status } = getAttendanceStatus(user.pin, day);
      if (status === "P") totalPresentCount++;
      else if (status === "A") totalAbsentCount++;
      else if (status === "W") totalWeekendCount++;
    }
  });

  return (
    <div className="space-y-4">
      
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Attendance Report (উপস্থিতি প্রতিবেদন)</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Displays dynamic attendance codes: <strong className="text-emerald-600">P</strong> (Present) for logs, <strong className="text-rose-500">A</strong> (Absent) for quiet weekdays, <strong className="text-slate-500">W</strong> (Weekend) for empty weekends.
          </p>
        </div>

        {/* Reload logs */}
        <button
          onClick={loadData}
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-800 dark:text-slate-200 cursor-pointer transition-all shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload logs</span>
        </button>
      </div>

      {/* Modern Grid Overview widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-sm">
        <div className="p-3 border-r border-slate-100 dark:border-slate-800 last:border-0">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Filtering Scope</span>
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{filteredUsers.length} active profiles</span>
        </div>
        <div className="p-3 border-r border-slate-100 dark:border-slate-800 last:border-0">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Total Present (P)</span>
          <span className="text-sm font-extrabold text-emerald-600">{totalPresentCount} logs</span>
        </div>
        <div className="p-3 border-r border-slate-100 dark:border-slate-800 last:border-0">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Total Absent (A)</span>
          <span className="text-sm font-extrabold text-rose-500">{totalAbsentCount} days</span>
        </div>
        <div className="p-3 last:border-0">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Total Weekends (W)</span>
          <span className="text-sm font-extrabold text-slate-500">{totalWeekendCount} days</span>
        </div>
      </div>

      {/* Control Tools Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Fillers */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Month Selector dropdown */}
          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-[10px] font-bold text-slate-400">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold focus:ring-0 text-slate-700 dark:text-white py-0 cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[150px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, PIN or campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg placeholder-slate-400 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Campus selection dropdown */}
          <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-[10px] font-bold text-slate-400">Campus:</span>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold focus:ring-0 text-slate-700 dark:text-white py-0 cursor-pointer"
            >
              <option value="All">All Campuses</option>
              {uniqueCampuses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Triggers Grid (Export & Copy) */}
        <div className="flex items-center space-x-2 shrink-0">
          
          {/* Download to Excel */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all shadow-sm"
            title="Export full grid report to Excel CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            <span>Excel xlsx</span>
          </button>

          {/* Copy Table utilities */}
          <div className="relative">
            <button
              onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              <span>Copy</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
            </button>

            {isCopyDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsCopyDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 py-1.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-100">
                  <button
                    onClick={() => {
                      handleCopyToClipboard(true);
                      setIsCopyDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center space-x-2 transition-colors border-b border-slate-100 dark:border-slate-800"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>With Headers (হেডার সহ)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCopyToClipboard(false);
                      setIsCopyDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center space-x-2 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Without Headers (হেডার ছাড়া)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Matrix panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full border-collapse text-[11px] whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400 sticky left-0 z-30 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">SL</th>
                <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400 sticky left-[36px] z-30 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">Name & Details</th>
                <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">PIN</th>
                <th className="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">Campus</th>
                {Array.from({ length: 31 }, (_, i) => {
                  const dayNum = i + 1;
                  // Subtly italicize or mark if weekend
                  let isWeekend = false;
                  if (activeMonthOpt) {
                    const d = new Date(activeMonthOpt.year, activeMonthOpt.monthIndex, dayNum);
                    isWeekend = d.getDay() === 5; // Friday only
                  }
                  return (
                    <th 
                      key={dayNum} 
                      className={`px-2 py-2 text-center font-extrabold border-r border-slate-200 dark:border-slate-700 w-10 ${
                        isWeekend ? "text-blue-600 bg-blue-50/20 dark:bg-slate-800/40" : "text-slate-500"
                      }`}
                    >
                      D{dayNum}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={35} className="py-12 text-center text-slate-400 font-semibold">
                    No active matching profiles found for report parameters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr key={user.pin} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Sticky SL */}
                    <td className="px-3 py-2 font-bold text-slate-500 text-left sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                      {idx + 1}
                    </td>

                    {/* Sticky Name */}
                    <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200 text-left sticky left-[36px] z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                      <div className="max-w-[150px] truncate" title={user.name}>
                        {user.name}
                      </div>
                    </td>

                    <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                      {user.pin}
                    </td>

                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                      <div className="max-w-[120px] truncate" title={user.campus}>
                        {user.campus}
                      </div>
                    </td>

                    {/* Dynamic Day 1 to Day 31 Cells */}
                    {Array.from({ length: 31 }, (_, i) => {
                      const dayNum = i + 1;
                      const { status } = getAttendanceStatus(user.pin, dayNum);

                      if (status === "P") {
                        return (
                          <td 
                            key={dayNum} 
                            className="px-1.5 py-1.5 border-r border-slate-100 dark:border-slate-800 text-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[12px]"
                            title="Present (তথ্য আছে)"
                          >
                            P
                          </td>
                        );
                      } else if (status === "W") {
                        return (
                          <td 
                            key={dayNum} 
                            className="px-1.5 py-1.5 border-r border-slate-100 dark:border-slate-800 text-center bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[12px]"
                            title="Weekend (সাপ্তাহিক ছুটি)"
                          >
                            W
                          </td>
                        );
                      } else if (status === "A") {
                        return (
                          <td 
                            key={dayNum} 
                            className="px-1.5 py-1.5 border-r border-slate-100 dark:border-slate-800 text-center bg-rose-500/10 text-rose-500 dark:text-rose-400 font-extrabold text-[12px]"
                            title="Absent (কোনো তথ্য নেই)"
                          >
                            A
                          </td>
                        );
                      } else {
                        // Empty/Invalid days (e.g. Feb 31st or Sep 31st)
                        return (
                          <td 
                            key={dayNum} 
                            className="px-1.5 py-1.5 border-r border-slate-100 dark:border-slate-800 text-center bg-slate-50/40 dark:bg-slate-900/40 opacity-30 text-slate-400"
                          >
                            -
                          </td>
                        );
                      }
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Copy Actions Feed alert */}
      {copyStatus && (
        <div className="fixed bottom-4 right-4 z-50 p-3 rounded-lg text-xs bg-slate-900 border border-slate-800 dark:bg-white dark:border-slate-200 text-white dark:text-slate-900 flex items-center space-x-2 font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Table {copyStatus}</span>
        </div>
      )}

    </div>
  );
}
