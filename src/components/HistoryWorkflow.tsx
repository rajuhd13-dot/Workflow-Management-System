import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { User, FlatWorkflowRecord } from "../types";
import { safeSessionStorage } from "../storage";
import { Search, Calendar, ChevronDown, ListFilter, RefreshCw, AlertCircle, Edit2, Trash2, X } from "lucide-react";

interface HistoryWorkflowProps {
  currentUser: User;
}

export default function HistoryWorkflow({ currentUser }: HistoryWorkflowProps) {
  const [workflows, setWorkflows] = useState<FlatWorkflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [campusQuery, setCampusQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const itemsPerPage = 8;

  // Edit Modal State
  const [editingWorkflow, setEditingWorkflow] = useState<FlatWorkflowRecord | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<FlatWorkflowRecord | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editHistory, setEditHistory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Retrieve workflows from backend API
  const fetchHistory = async (background = true) => {
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
      const res = await fetch(
        `/api/workflow/history?pin=${pinParam}&role=${currentUser.role}`,
      );
      const body = await res.json();
      if (body.success) {
        setWorkflows(body.data || []);
        safeSessionStorage.setItem(cacheKey, JSON.stringify(body.data || []));
      }
    } catch (err) {
      console.error("Error fetching workflows list:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(false);
  }, [currentUser]);

  // Extract unique month columns dynamically from data to offer monthly filter
  const monthKeysSet = new Set<string>();
  workflows.forEach((w) => {
    if (w.monthKey) monthKeysSet.add(w.monthKey);
  });
  const availableMonths = Array.from(monthKeysSet).sort();

  // Filters logic
  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch =
      w.workHistory.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesName = 
      nameQuery === "" || 
      w.name.toLowerCase().includes(nameQuery.toLowerCase()) ||
      w.pin.toLowerCase().includes(nameQuery.toLowerCase());
    
    const matchesCampus =
      campusQuery === "" || w.campus.toLowerCase().includes(campusQuery.toLowerCase());

    const matchesMonth =
      selectedMonth === "all" || w.monthKey === selectedMonth;
    
    return matchesSearch && matchesName && matchesCampus && matchesMonth;
  });

  // Sort logic
  const sortedWorkflows = [...filteredWorkflows].sort((a, b) => {
    const d1 = new Date(a.date).getTime();
    const d2 = new Date(b.date).getTime();
    return sortOrder === "desc" ? d2 - d1 : d1 - d2;
  });

  // Pagination logic
  const totalItems = sortedWorkflows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWorkflows = sortedWorkflows.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setCurrentPage(1);
  };

  const startEdit = (workflow: FlatWorkflowRecord) => {
    setEditingWorkflow(workflow);
    setEditDate(workflow.date);
    setEditHistory(workflow.workHistory);
    setActionMessage(null);
  };

  const confirmDelete = (workflow: FlatWorkflowRecord) => {
    setWorkflowToDelete(workflow);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;

    try {
      const res = await fetch("/api/workflow/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: workflowToDelete.pin,
          monthKey: workflowToDelete.monthKey,
          entrySl: workflowToDelete.entrySl
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Workflow entry has been deleted successfully.",
          timer: 2000,
          showConfirmButton: false
        });
        fetchHistory(false);
      } else {
        alert(data.error || "Failed to delete workflow entry.");
      }
    } catch (e) {
      console.error("Error during deletion:", e);
    } finally {
      setIsDeleteConfirmOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingWorkflow) return;
    setIsSaving(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/workflow/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: editingWorkflow.pin,
          monthKey: editingWorkflow.monthKey,
          entrySl: editingWorkflow.entrySl,
          date: editDate,
          workHistory: editHistory
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: "success", text: "Workflow updated successfully." });
        setTimeout(() => {
          setEditingWorkflow(null);
          fetchHistory(false);
        }, 1000);
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to update workflow." });
      }
    } catch (e) {
      setActionMessage({ type: "error", text: "Server error during update." });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (err) {
      return dateString;
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Module Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Workflow Ledger Logs
          </h2>
          <p className="text-slate-500 text-[11px]">
            {currentUser.role === "User"
              ? "View and manage all your logged workflows across target months."
              : "Comprehensive system logs across all operational Campus sectors."}
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Control Filters Area */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search work history content..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white outline-none focus:ring-1 focus:ring-blue-600 transition-all"
            />
          </div>

          {/* Admin Specific Search Fields */}
          {(currentUser.role === "Admin" || currentUser.role === "Super Admin") && (
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:flex-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filter by User Name..."
                  value={nameQuery}
                  onChange={(e) => {
                    setNameQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950 outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filter by Campus..."
                  value={campusQuery}
                  onChange={(e) => {
                    setCampusQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950 outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* Filters Selectors */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto items-center">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-40 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="all">📅 All Month Columns</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    Column: {m}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={toggleSortOrder}
              className="w-full sm:w-auto flex items-center justify-center space-x-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer font-medium"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Sort: {sortOrder === "desc" ? "Latest" : "Oldest"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Presentation */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-xs">
        {isLoading ? (
          <div className="p-10 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-slate-500 text-[11px] font-medium">
              Assembling Ledger Logs...
            </p>
          </div>
        ) : paginatedWorkflows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <div>
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                No matching logs found
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Try tweaking filters or submit a new entry from the workflow
                portal.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10px]">
                  <th className="px-1.5 py-1 uppercase">User Name / Campus</th>
                  <th className="px-1.5 py-1 uppercase">Target Month</th>
                  <th className="px-1.5 py-1 uppercase">Log Entry Date</th>
                  <th className="px-1.5 py-1 uppercase">
                    Recorded Activity & Work History
                  </th>
                <th className="px-1.5 py-1 uppercase text-right">Index ID</th>
                  <th className="px-1.5 py-1 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedWorkflows.map((work, idx) => (
                  <tr
                    key={`${work.pin}-${work.date}-${idx}`}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <td className="px-1.5 py-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {work.name}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {work.campus} (PIN: {work.pin})
                      </p>
                    </td>
                    <td className="px-1.5 py-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 font-mono">
                        {work.monthKey}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 font-medium whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {formatDate(work.date)}
                    </td>
                    <td className="px-1.5 py-1 leading-relaxed max-w-xs font-normal text-[11px] break-words whitespace-pre-wrap">
                      {work.workHistory}
                    </td>
                    <td className="px-1.5 py-1 text-right font-mono text-[10px] text-slate-400">
                      SL: {work.entrySl}
                    </td>
                    <td className="px-1.5 py-1 text-right">
                      {(currentUser.role === "Super Admin" || currentUser.pin === work.pin) && (
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => startEdit(work)}
                            className="inline-flex items-center space-x-1 p-1 rounded text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit workflow"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => confirmDelete(work)}
                            className="inline-flex items-center space-x-1 p-1 rounded text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Delete workflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dynamic Pagination Panel Controls */}
        {!isLoading && totalItems > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {Math.min(startIndex + itemsPerPage, totalItems)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {totalItems}
              </span>{" "}
              record results
            </span>
            <div className="flex space-x-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Modal */}
      {editingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Edit Workflow Entry</h3>
              <button
                onClick={() => setEditingWorkflow(null)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {actionMessage && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  actionMessage.type === "error" 
                    ? "bg-rose-50 text-rose-600 border border-rose-200" 
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                }`}>
                  {actionMessage.text}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Update Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Work History / Recorded Activity
                </label>
                <textarea
                  value={editHistory}
                  onChange={(e) => setEditHistory(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-slate-800 dark:text-slate-200 resize-none"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button
                onClick={() => setEditingWorkflow(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                 <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/30 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Entry?</h3>
                 <p className="text-sm text-slate-500">Are you sure you want to delete this workflow entry? This action cannot be undone.</p>
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={() => setIsDeleteConfirmOpen(false)}
                   className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleDeleteWorkflow}
                   className="flex-1 px-4 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                 >
                   Yes, Delete
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
