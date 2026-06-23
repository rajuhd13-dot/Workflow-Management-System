import React, { useState, useEffect } from "react";
import { User, ReportData } from "../types";
import { safeSessionStorage } from "../storage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Users, Calendar, Map, RefreshCw, BarChart2, PieChart as PieIcon } from "lucide-react";

interface AttendanceReportProps {
  currentUser: User;
}

export default function AttendanceReport({ currentUser }: AttendanceReportProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async (background = true) => {
    if (!background) {
      const cached = safeSessionStorage.getItem("wms_cache_reports");
      if (cached) {
        setReport(JSON.parse(cached));
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }

    try {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      const body = await res.json();
      if (body.success) {
        setReport(body.data);
        safeSessionStorage.setItem("wms_cache_reports", JSON.stringify(body.data));
      } else {
        throw new Error(body.error || "Failed to load report data");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Failed to fetch information for Attendance Report: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(false);
  }, []);

  if (error && !report) {
    return (
      <div className="p-16 text-center space-y-4">
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 rounded-xl inline-block max-w-md mx-auto">
          <p className="text-rose-600 dark:text-rose-400 text-sm font-medium">{error}</p>
        </div>
        <button
          onClick={() => { setError(null); fetchReports(false); }}
          className="block mx-auto px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="p-16 text-center space-y-2">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-slate-500 text-xs font-medium">Assembling statistical analytics...</p>
      </div>
    );
  }

  // Soft aesthetic color scheme for Pie segments
  const PALETTE = ["#2563eb", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-3.5">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Workflow Report</h2>
          <p className="text-[11px] text-slate-500">
            Automated metrics aggregating historical logs, student campus participation and seasonal monthly workflow trends.
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Charts</span>
        </button>
      </div>

      {/* Aggregate Overview Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Widget: Total logs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Workflow Log Entries</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{report.totalWorkflows}</h4>
          </div>
        </div>

        {/* Widget: Total Users */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered System Profiles</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{report.totalUsers}</h4>
          </div>
        </div>

        {/* Widget: Campuses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campus Operational Sectors</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{report.totalCampuses}</h4>
          </div>
        </div>

      </div>

      {/* Charts visual grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        
        {/* User Wise Workload Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">User Workload Activity</span>
          </div>
          <div className="h-60 text-xs">
            {report.userWise.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">No user data yet available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.userWise} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#94a3b8" allowDecimals={false} style={{ fontSize: '10px' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: '11px' }}
                    labelClassName="font-semibold text-slate-800"
                  />
                  <Bar dataKey="entriesCount" name="Total Logged Entries" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Campus Volume Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <PieIcon className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Campus Allocation Index</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
            <div className="sm:col-span-2 h-56 text-xs">
              {report.campusWise.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">No campus records logged.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.campusWise}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="entriesCount"
                      nameKey="campus"
                    >
                      {report.campusWise.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Explanatory Legend panel */}
            <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Proportional Shares</span>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {report.campusWise.map((entry, idx) => (
                  <div key={entry.campus} className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}></span>
                    <span className="text-[10.5px] truncate text-slate-600 dark:text-slate-350" title={entry.campus}>
                      {entry.campus} ({entry.entriesCount})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trend Performance Line Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm space-y-3 lg:col-span-2">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Temporal Monthly Volumetric Trends</span>
          </div>
          <div className="h-60 text-xs">
            {report.monthWise.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">No monthly logs compiled.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.monthWise} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#94a3b8" allowDecimals={false} style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="entriesCount" 
                    name="Logged Actions" 
                    stroke="#2563eb" 
                    strokeWidth={2} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
