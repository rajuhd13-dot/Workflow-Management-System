import React, { useState, useEffect } from "react";
import { User, FlatWorkflowRecord } from "../types";
import { safeSessionStorage } from "../storage";
import { Search, Calendar, MapPin, UserCheck, Shield, ChevronRight, Download, Eye, RotateCcw } from "lucide-react";

interface FilterWorkflowProps {
  currentUser: User;
}

export default function FilterWorkflow({ currentUser }: FilterWorkflowProps) {
  const [workflows, setWorkflows] = useState<FlatWorkflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Advanced Filter state variables
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterPin, setFilterPin] = useState("");
  const [filterCampus, setFilterCampus] = useState(currentUser.role === "User" ? currentUser.campus : "all");
  const [filterRole, setFilterRole] = useState("all");

  // Fetch all workflows or user workflows
  const fetchWorkflows = async (background = true) => {
    const cacheKey = `wms_cache_history_${currentUser.pin}`;
    
    if (!background) {
      const cached = safeSessionStorage.getItem(cacheKey);
      if (cached) {
        setWorkflows(JSON.parse(cached));
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }

    try {
      const pinParam = currentUser.role === "User" ? currentUser.pin : "";
      const res = await fetch(`/api/workflow/history?pin=${pinParam}&role=${currentUser.role}`);
      const body = await res.json();
      if (body.success) {
        setWorkflows(body.data || []);
        safeSessionStorage.setItem(cacheKey, JSON.stringify(body.data || []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows(false);
  }, [currentUser]);

  // Extract distinct campuses and roles, for Admin/Super Admin selection filters
  const campusSet = new Set<string>();
  workflows.forEach((w) => campusSet.add(w.campus));
  const distinctCampuses = Array.from(campusSet);

  // Apply sequential filtering
  const filteredWorkflows = workflows.filter((w) => {
    // 1. Role boundaries: standard user ONLY sees themselves
    if (currentUser.role === "User" && String(w.pin) !== String(currentUser.pin)) {
      return false;
    }

    // 2. Name search filter
    if (filterName && !w.name.toLowerCase().includes(filterName.toLowerCase())) {
      return false;
    }

    // 3. User PIN filter
    if (filterPin && !String(w.pin).includes(filterPin)) {
      return false;
    }

    // 4. Campus Location filter
    if (filterCampus !== "all" && w.campus !== filterCampus) {
      return false;
    }

    // 5. Date Range filter
    if (startDate && new Date(w.date) < new Date(startDate)) {
      return false;
    }
    if (endDate && new Date(w.date) > new Date(endDate)) {
      return false;
    }

    return true;
  });

  const resetAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setFilterName("");
    setFilterPin("");
    setFilterCampus(currentUser.role === "User" ? currentUser.campus : "all");
    setFilterRole("all");
  };

  const downloadFilteredCSV = () => {
    if (filteredWorkflows.length === 0) return;
    
    // Headers matching Workflow Table Schema
    const headers = ["Timestamp", "Name", "PIN", "Campus", "Responsibility", "Month Key", "Entry Date", "Work History"];
    
    const rows = filteredWorkflows.map((w) => [
      w.timestamp || "",
      `"${w.name.replace(/"/g, '""')}"`,
      w.pin,
      `"${w.campus.replace(/"/g, '""')}"`,
      `"${(w.responsibility || "").replace(/"/g, '""')}"`,
      w.monthKey,
      w.date,
      `"${w.workHistory.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Workflow_Report_Filtered_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Advanced Filter Workspace</h2>
          <p className="text-[11px] text-slate-500">
            {currentUser.role === "User" 
              ? "Query and drill down into your personal workflow log statements." 
              : "Perform robust queries, cross-campus evaluation and export custom dataset files."}
          </p>
        </div>

        {filteredWorkflows.length > 0 && (
          <button
            onClick={downloadFilteredCSV}
            className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow shadow-blue-600/15 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV ({filteredWorkflows.length})</span>
          </button>
        )}
      </div>

      {/* Advanced query panel block */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center space-x-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Configure Active Matrix Query</span>
          </h3>
          <button
            onClick={resetAllFilters}
            className="text-xs text-slate-400 hover:text-blue-600 flex items-center space-x-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Query</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          
          {/* Query: Date Range Start */}
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Start Date Range</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-1 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>

          {/* Query: Date Range End */}
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-0.5">End Date Range</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-1 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>

          {/* Query: Name (Disabled for basic user) */}
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Worker Name match</label>
            <input
              type="text"
              placeholder={currentUser.role === "User" ? currentUser.name : "e.g. Nazmul"}
              value={currentUser.role === "User" ? "" : filterName}
              onChange={(e) => setFilterName(e.target.value)}
              disabled={currentUser.role === "User"}
              className={`w-full px-2.5 py-1 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-blue-600 font-medium ${
                currentUser.role === "User"
                  ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white"
              }`}
            />
          </div>

          {/* Query: PIN (Disabled for basic user) */}
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Worker PIN match</label>
            <input
              type="text"
              placeholder={currentUser.role === "User" ? `• • ${currentUser.pin.slice(-2)}` : "e.g. 2653"}
              value={currentUser.role === "User" ? "" : filterPin}
              onChange={(e) => setFilterPin(e.target.value)}
              disabled={currentUser.role === "User"}
              className={`w-full px-2.5 py-1 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-blue-600 font-mono ${
                currentUser.role === "User"
                  ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white"
              }`}
            />
          </div>

          {/* Query: Campus Selector */}
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Campus Location</label>
            <select
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
              disabled={currentUser.role === "User"}
              className={`w-full px-2.5 py-1 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-blue-600 font-medium ${
                currentUser.role === "User"
                  ? "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              }`}
            >
              {currentUser.role === "User" ? (
                <option value={currentUser.campus}>{currentUser.campus}</option>
              ) : (
                <>
                  <option value="all">🌐 All Locations</option>
                  {distinctCampuses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </>
              )}
            </select>
          </div>

        </div>
      </div>

      {/* Output results */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-xs">
        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Filter Findings</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
            {filteredWorkflows.length} matches
          </span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center space-y-2">
            <span className="font-mono text-xs text-slate-400 animate-pulse">Loading ledger indices...</span>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <span className="font-semibold block text-xs mb-1 text-slate-600 dark:text-slate-400">No Query Results MATCHED</span>
            <span>Adjust the dates or search inputs to query of columns.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase bg-slate-50 dark:bg-slate-950/20">
                  <th className="px-1.5 py-1">Campus Sector</th>
                  <th className="px-1.5 py-1">Employee Name</th>
                  {!(currentUser.role === "Admin" || currentUser.role === "Super Admin") && (
                    <th className="px-1.5 py-1">Responsibility</th>
                  )}
                  <th className="px-1.5 py-1">Date logged</th>
                  <th className="px-1.5 py-1">Work History details</th>
                  <th className="px-1.5 py-1 text-right font-mono">Row Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {filteredWorkflows.map((item, idx) => (
                  <tr key={`${item.pin}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                    <td className="px-1.5 py-1 font-semibold text-slate-900 dark:text-slate-100 max-w-[100px] truncate">{item.campus}</td>
                    <td className="px-1.5 py-1">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono">PIN {item.pin}</p>
                    </td>
                    {!(currentUser.role === "Admin" || currentUser.role === "Super Admin") && (
                      <td className="px-1.5 py-1 text-slate-600 dark:text-slate-400 font-medium">
                        {item.responsibility || <span className="text-slate-400 italic text-[10px]">—</span>}
                      </td>
                    )}
                    <td className="px-1.5 py-1 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                      {item.date}
                    </td>
                    <td className="px-1.5 py-1 text-slate-600 dark:text-slate-300 max-w-sm break-words font-normal leading-relaxed text-[11px] whitespace-pre-wrap">
                      {item.workHistory}
                    </td>
                    <td className="px-1.5 py-1 text-right font-mono text-slate-400 text-[10px]">
                      SL: {item.entrySl} ({item.monthKey})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
