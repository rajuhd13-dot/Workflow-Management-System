import React, { useState, useEffect } from "react";
import { User, FlatWorkflowRecord } from "../types";
import { Download, FileSpreadsheet, FileText, Printer, FileDown, Eye, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

interface DownloadWorkflowProps {
  currentUser: User;
}

export default function DownloadWorkflow({ currentUser }: DownloadWorkflowProps) {
  const [workflows, setWorkflows] = useState<FlatWorkflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("all");

  const fetchWorkflowsList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workflow/history");
      const body = await res.json();
      if (body.success) {
        setWorkflows(body.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflowsList();
  }, []);

  // Filter months
  const monthKeysSet = new Set<string>();
  workflows.forEach((w) => {
    if (w.monthKey) monthKeysSet.add(w.monthKey);
  });
  const monthKeys = Array.from(monthKeysSet).sort();

  const getFilteredData = () => {
    if (selectedMonth === "all") return workflows;
    return workflows.filter((w) => w.monthKey === selectedMonth);
  };

  const handleDownloadCSV = () => {
    const data = getFilteredData();
    if (data.length === 0) return;

    const headers = ["SL", "Timestamp", "Name", "PIN", "Campus", "Responsibility", "Month Key", "Entry Date", "Work History"];
    const rows = data.map((w, idx) => [
      idx + 1,
      w.timestamp || "",
      `"${w.name.replace(/"/g, '""')}"`,
      w.pin,
      `"${w.campus.replace(/"/g, '""')}"`,
      `"${(w.responsibility || "").replace(/"/g, '""')}"`,
      w.monthKey,
      w.date,
      `"${w.workHistory.replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Workflow_Database_${selectedMonth}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcelXLS = () => {
    // Generate an XML Spreadsheet 2003 compatible XLS structure which opens natively in Microsoft Excel
    const data = getFilteredData();
    if (data.length === 0) return;

    let xlsContent = 
      `<?xml version="1.0"?>\n` +
      `<?mso-application progid="Excel.Sheet"?>\n` +
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n` +
      ` xmlns:o="urn:schemas-microsoft-com:office:office"\n` +
      ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n` +
      ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n` +
      ` xmlns:html="http://www.w3.org/TR/REC-html40">\n` +
      ` <Worksheet ss:Name="Workflow History">\n` +
      `  <Table>\n` +
      `   <Row ss:StyleID="HeaderStyle">\n` +
      `    <Cell><Data ss:Type="String">SL</Data></Cell>\n` +
      `    <Cell><Data ss:Type="String">Timestamp</Data></Cell>\n` +
      `    <Cell><Data ss:Type="String">Name</Data></Cell>\n` +
      `    <Cell><Data ss:Type="String">PIN</Data></Cell>\n` +
      `    <Cell><Data ss:Type="String">Campus</Data></Cell>\n` +
      `    <Cell><Data ss:Type="String">Responsibility</Data></Cell>\n` +
      `    <Cell><Data ss:Type="String">Month Column</Data></Cell>\n` +
      `    <Cell><Data ss:Type="String">Date Logged</Data></Cell>\n` +
      `    <Cell><Data ss:Type="String">Work History</Data></Cell>\n` +
      `   </Row>\n`;

    data.forEach((w, idx) => {
      xlsContent += 
        `   <Row>\n` +
        `    <Cell><Data ss:Type="Number">${idx + 1}</Data></Cell>\n` +
        `    <Cell><Data ss:Type="String">${w.timestamp || ""}</Data></Cell>\n` +
        `    <Cell><Data ss:Type="String">${w.name}</Data></Cell>\n` +
        `    <Cell><Data ss:Type="String">${w.pin}</Data></Cell>\n` +
        `    <Cell><Data ss:Type="String">${w.campus}</Data></Cell>\n` +
        `    <Cell><Data ss:Type="String">${w.responsibility || ""}</Data></Cell>\n` +
        `    <Cell><Data ss:Type="String">${w.monthKey}</Data></Cell>\n` +
        `    <Cell><Data ss:Type="String">${w.date}</Data></Cell>\n` +
        `    <Cell><Data ss:Type="String">${w.workHistory.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>\n` +
        `   </Row>\n`;
    });

    xlsContent += 
      `  </Table>\n` +
      ` </Worksheet>\n` +
      `</Workbook>\n`;

    const blob = new Blob([xlsContent], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Workflow_Database_${selectedMonth}_Export.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    const data = getFilteredData();
    if (data.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to open print layouts.");
      return;
    }

    const rowsMarkup = data.map((w, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${w.name}</strong><br/><small>PIN ${w.pin}</small></td>
        <td>${w.campus}</td>
        <td><strong>${w.responsibility || "—"}</strong></td>
        <td><span style="border-radius:4px; padding:2px 6px; background:#e0e7ff; font-family:monospace; font-size:11px;">${w.monthKey}</span></td>
        <td>${w.date}</td>
        <td>${w.workHistory}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Workflow Management System - Data Audit Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #efefef; padding-bottom: 10px; margin-bottom: 5px; }
            small { color: #888; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
            th { background-color: #f9f9f9; font-weight: bold; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h2>Workflow Management System</h2>
          <p><strong>Generated Audit Document</strong> &bull; Compiled: ${new Date().toLocaleDateString()} &bull; Target Filter: <strong>Month: ${selectedMonth}</strong></p>
          <button onclick="window.print()" style="padding: 10px 18px; background: #6366f1; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 20px;">Print This Report</button>
          <table>
            <thead>
              <tr>
                <th style="width:3%;">SL</th>
                <th style="width:15%;">Employee Details</th>
                <th style="width:13%;">Campus Unit</th>
                <th style="width:12%;">Responsibility</th>
                <th style="width:10%;">Target Column</th>
                <th style="width:10%;">Entry Date</th>
                <th style="width:37%;">Work History Log</th>
              </tr>
            </thead>
            <tbody>
              ${rowsMarkup}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredData = getFilteredData();

  return (
    <div className="space-y-3">
      
      {/* Intro info */}
      <div>
        <h2 className="text-lg font-bold tracking-tight">Download & Export Center</h2>
        <p className="text-[11px] text-slate-500">
          Supervise document preparation, filter records by targeted monthly spreadsheets and trigger local desktop exports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* Configurations block */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 border-b border-slate-100 dark:border-slate-850 pb-1.5">
              Export Configuration
            </h3>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 focus:indigo-500">
                Target Monthly column
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">📂 Extract Complete Historical Ledger</option>
                {monthKeys.map((key) => (
                  <option key={key} value={key}>Spreadsheet key: {key}</option>
                ))}
              </select>
            </div>

            <div className="rounded-lg p-2.5 bg-indigo-500/5 text-indigo-500/90 text-[11px] flex items-start space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Selecting a target month will constraint the output lists ONLY to records logged under that column in the Sheets database model.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons and preview block */}
        <div className="lg:col-span-2 space-y-3">
          
          {/* Card list of downloads */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Download CSV card */}
            <button
              onClick={handleDownloadCSV}
              disabled={filteredData.length === 0}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between h-32 group transition-all cursor-pointer ${
                filteredData.length > 0
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-550 hover:shadow-md"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-900 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-500 w-fit">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Download CSV</h4>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Comma Separated File. Compatible with standard systems.</p>
              </div>
            </button>
 
            {/* Download XLS card */}
            <button
              onClick={handleDownloadExcelXLS}
              disabled={filteredData.length === 0}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between h-32 group transition-all cursor-pointer ${
                filteredData.length > 0
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-550 hover:shadow-md"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-900 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="p-1.5 rounded bg-indigo-500/10 text-indigo-550 dark:text-indigo-400 w-fit">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Download MS Excel (.xls)</h4>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Microsoft XML structure format. Opens natively in Excel.</p>
              </div>
            </button>
 
            {/* Print Friendly list */}
            <button
              onClick={handlePrintReport}
              disabled={filteredData.length === 0}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between h-32 group transition-all cursor-pointer ${
                filteredData.length > 0
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-550 hover:shadow-md"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-900 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="p-1.5 rounded bg-orange-500/10 text-orange-500 w-fit">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Print / PDF Layout</h4>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Optimized black &amp; white layout to print or save to PDF.</p>
              </div>
            </button>
 
          </div>

          {/* Quick Preview panel */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-xs">
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Dataset Preview List ({filteredData.length} records)</span>
              <span className="text-[9px] text-slate-400 font-mono">Target: {selectedMonth !== "all" ? `Column: ${selectedMonth}` : 'Whole Ledger'}</span>
            </div>

            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-500 font-medium">Assembling preview metrics...</div>
            ) : filteredData.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 text-slate-500 bg-slate-50/50 dark:bg-slate-950/20">
                No active rows are logged for export.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-850">
                  <thead className="bg-slate-50 dark:bg-slate-950/20 text-[10px] text-slate-450 sticky top-0 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-1.5 py-1">Name</th>
                      <th className="px-1.5 py-1">Campus</th>
                      <th className="px-1.5 py-1">Responsibility</th>
                      <th className="px-1.5 py-1">Date</th>
                      <th className="px-1.5 py-1">Work History Snippet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                    {filteredData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/5 text-[11px]">
                        <td className="px-1.5 py-1 font-bold text-slate-900 dark:text-slate-100">{row.name}</td>
                        <td className="px-1.5 py-1 text-slate-450">{row.campus}</td>
                        <td className="px-1.5 py-1 text-slate-450 font-medium">{row.responsibility || "—"}</td>
                        <td className="px-1.5 py-1 text-slate-500 font-mono text-[10px]">{row.date}</td>
                        <td className="px-1.5 py-1 truncate max-w-[200px] text-slate-450 text-[11px]" title={row.workHistory}>{row.workHistory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.length > 10 && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/10 text-center text-[10px] text-slate-400 font-medium border-t border-slate-100 dark:border-slate-900">
                    And {filteredData.length - 10} more rows logged in spreadsheet context.
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
