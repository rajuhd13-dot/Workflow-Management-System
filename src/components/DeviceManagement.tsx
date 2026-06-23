import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { 
  Plus, 
  Eye, 
  Edit2, 
  Trash2,
  Search, 
  X, 
  Check, 
  AlertCircle,
  Laptop,
  Smartphone,
  MousePointer2,
  Headphones,
  Keyboard,
  Battery,
  Backpack,
  MoreVertical,
  Monitor,
  LayoutGrid,
  FileText,
  Download,
  ChevronUp,
  ChevronDown,
  Square,
  CheckSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, DeviceRecord, Device } from "../types";

interface DeviceManagementProps {
  currentUser: User;
}

const EMPTY_DEVICE: Device = {
  type: "",
  config: "",
  serial: "",
  quantity: "",
  condition: "",
  buyingDate: "",
  purchaseName: "",
  collectedDate: "",
};

const DEFAULT_DEVICES = (role: string) => ({
  device1: { ...EMPTY_DEVICE },
  device2: { ...EMPTY_DEVICE, type: "Mobile" },
  device3: { ...EMPTY_DEVICE, type: "Mouse" },
  device4: { ...EMPTY_DEVICE, type: "MousePad" },
  device5: { ...EMPTY_DEVICE, type: "Headphone" },
  device6: { ...EMPTY_DEVICE, type: "Laptop Bag" },
  device7: { ...EMPTY_DEVICE, type: "Keyboard" },
  device8: { ...EMPTY_DEVICE, type: "UPS" },
});

export default function DeviceManagement({ currentUser }: DeviceManagementProps) {
  const [records, setRecords] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportColumns, setExportColumns] = useState<{ id: string; label: string; selected: boolean }[]>([]);
  const [currentRecord, setCurrentRecord] = useState<Partial<DeviceRecord> | null>(null);
  const [filters, setFilters] = useState({
    userName: "",
    userPin: "",
    campusName: "All",
    officialNumber: ""
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const campuses = [
    "Farmgate ESM",
    "Motijheel ESM",
    "Bakshibazar ESM",
    "Cantonment ESM",
    "Khulna ESM",
    "Rajshahi ESM",
    "Oxygen Moor(ctg) ESM",
    "Mymensingh ESM",
  ];

  const allDeviceTypes = ["Laptop", "Desktop", "Mobile", "Mouse", "MousePad", "Headphone", "Laptop Bag", "Keyboard", "UPS"];
  const assignableDeviceTypes = ["Laptop", "Desktop"];
  const remarks = ["Device+Phone", "Device", "Phone"];

  useEffect(() => {
    // Initialize export columns
    const baseCols = [
      { id: "userName", label: "User Name", selected: true },
      { id: "userPin", label: "User Pin", selected: true },
      { id: "campusName", label: "Campus Name", selected: true },
      { id: "officialNumber", label: "Official Number", selected: true },
      { id: "remark", label: "Remark", selected: true },
      { id: "roomNumber", label: "Room Number", selected: true },
      { id: "sendToPiLabsDate", label: "Send to PiLabs", selected: false },
      { id: "receivedFromPiLabsDate", label: "Received from PiLabs", selected: false },
    ];
    
    const deviceCols = [];
    for (let i = 1; i <= 8; i++) {
      deviceCols.push({ id: `device${i}_type`, label: `Device ${i} Type`, selected: i === 1 });
      deviceCols.push({ id: `device${i}_serial`, label: `Device ${i} Serial`, selected: i === 1 });
      deviceCols.push({ id: `device${i}_config`, label: `Device ${i} Config`, selected: false });
    }
    
    setExportColumns([...baseCols, ...deviceCols]);
  }, []);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch devices");
    } finally {
      setLoading(false);
    }
  };

  const manualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/devices/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showAlert(`Sync successful: Logged ${data.count} records`);
        fetchDevices();
      } else {
        showAlert(data.error || "Sync engine failed", "error");
      }
    } catch (err) {
      showAlert("Network interruption during sync", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const showAlert = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;

    // Validation
    if (!currentRecord.userName || !currentRecord.userPin || !currentRecord.campusName) {
      showAlert("Please highlight all primary employee identifiers.", "error");
      return;
    }

    try {
      const method = isEditModalOpen ? "PUT" : "POST";
      const url = isEditModalOpen ? `/api/devices/${currentRecord.sl}` : "/api/devices";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentRecord),
      });
      const data = await res.json();

      if (data.success) {
        showAlert(isEditModalOpen ? "Device updated successfully" : "New record logged successfully");
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        fetchDevices();
      } else {
        showAlert(data.error || "Execution failed", "error");
      }
    } catch (err) {
      showAlert("Network or system disruption detected", "error");
    }
  };

  const openAddModal = () => {
    setCurrentRecord({
      userName: "",
      userPin: "",
      campusName: "",
      officialNumber: "",
      ...DEFAULT_DEVICES(currentUser.role),
      remark: "Device+Phone",
      sendToPiLabsDate: "",
      receivedFromPiLabsDate: "",
      roomNumber: "",
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (record: DeviceRecord) => {
    setCurrentRecord({ ...record });
    setIsEditModalOpen(true);
  };

  const confirmDelete = (record: DeviceRecord) => {
    setDeviceToDelete(record);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;

    try {
      const res = await fetch(`/api/devices/${deviceToDelete.sl}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Device record has been deleted successfully.",
          timer: 2000,
          showConfirmButton: false
        });
        fetchDevices();
      } else {
        showAlert(data.error || "Failed to delete device record", "error");
      }
    } catch (err) {
      showAlert("Network disruption during deletion", "error");
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeviceToDelete(null);
    }
  };

  const openViewModal = (record: DeviceRecord) => {
    setCurrentRecord({ ...record });
    setIsViewModalOpen(true);
  };

  const handleMoveColumn = (index: number, direction: "up" | "down") => {
    const newCols = [...exportColumns];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCols.length) return;
    
    [newCols[index], newCols[targetIndex]] = [newCols[targetIndex], newCols[index]];
    setExportColumns(newCols);
  };

  const toggleColumnSelection = (id: string) => {
    setExportColumns(exportColumns.map(col => 
      col.id === id ? { ...col, selected: !col.selected } : col
    ));
  };

  const executeExport = () => {
    const selectedCols = exportColumns.filter(c => c.selected);
    if (selectedCols.length === 0) {
      showAlert("Please select at least one column for export", "error");
      return;
    }

    const headers = selectedCols.map(c => c.label).join(",");
    const rows = filteredRecords.map((r, idx) => {
      const values = selectedCols.map(col => {
        let val: any = "";
        
        if (col.id.startsWith("device")) {
          const [deviceNumStr, field] = col.id.replace("device", "").split("_");
          const num = parseInt(deviceNumStr);
          const device = (r[`device${num}` as keyof DeviceRecord] as Device);
          val = device ? device[field as keyof Device] : "";
        } else {
          val = (r as any)[col.id];
        }
        
        const stringVal = String(val || "").replace(/"/g, '""');
        return `"${stringVal}"`;
      });
      return values.join(",");
    });

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `device_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
    showAlert("Export completed successfully");
  };

  const filteredRecords = records.filter(r => {
    const matchesName = r.userName.toLowerCase().includes(filters.userName.toLowerCase());
    const matchesPin = String(r.userPin || "").includes(filters.userPin);
    const matchesOfficial = String(r.officialNumber || "").includes(filters.officialNumber);
    const matchesCampus = filters.campusName === "All" || r.campusName === filters.campusName;
    return matchesName && matchesPin && matchesOfficial && matchesCampus;
  });

  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "laptop": return <Laptop className="w-3.5 h-3.5" />;
      case "desktop": return <Monitor className="w-3.5 h-3.5" />;
      case "mobile": return <Smartphone className="w-3.5 h-3.5" />;
      case "mouse": return <MousePointer2 className="w-3.5 h-3.5" />;
      case "headphone": return <Headphones className="w-3.5 h-3.5" />;
      case "keyboard": return <Keyboard className="w-3.5 h-3.5" />;
      case "ups": return <Battery className="w-3.5 h-3.5" />;
      case "laptop bag": return <Backpack className="w-3.5 h-3.5" />;
      default: return <LayoutGrid className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Device Management
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                  {records.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Infrastructure Tracking & Lifecycle Inventory</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
               onClick={manualSync}
               disabled={isSyncing}
               className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer ${isSyncing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <LayoutGrid className={`w-3.5 h-3.5 mr-2 text-blue-600 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Registry"}
            </button>
            <button
               onClick={() => setIsSummaryModalOpen(true)}
               className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-2 text-blue-600" />
              Summary
            </button>
            <button
               onClick={() => setIsExportModalOpen(true)}
               className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-2 text-blue-600" />
              Export
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              Assign Device
            </button>
          </div>
        </div>

      </div>

      {/* Ledger Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
            <thead>
              <tr className="bg-[#3498db] text-white">
                <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] w-12 text-center">SL</th>
                <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px]">
                  <div className="flex flex-col gap-0.5">
                    <span>Current User Name</span>
                    <input 
                      type="text"
                      placeholder="Filter Name"
                      value={filters.userName}
                      onChange={(e) => setFilters({...filters, userName: e.target.value})}
                      className="w-full px-1 py-0.5 text-[11px] font-normal text-slate-700 bg-white border border-slate-200 rounded outline-none"
                    />
                  </div>
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] w-24">
                  <div className="flex flex-col gap-0.5">
                    <span>User Pin</span>
                    <input 
                      type="text"
                      placeholder="Filter PIN"
                      value={filters.userPin}
                      onChange={(e) => setFilters({...filters, userPin: e.target.value})}
                      className="w-full px-1 py-0.5 text-[11px] font-normal text-slate-700 bg-white border border-slate-200 rounded outline-none"
                    />
                  </div>
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px]">
                  <div className="flex flex-col gap-0.5">
                    <span>Campus Name</span>
                    <select
                      value={filters.campusName}
                      onChange={(e) => setFilters({...filters, campusName: e.target.value})}
                      className="w-full px-1 py-0.5 text-[11px] font-normal text-slate-700 bg-white border border-slate-200 rounded outline-none"
                    >
                      <option value="All">All Campuses</option>
                      {campuses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px]">
                  <div className="flex flex-col gap-0.5">
                    <span>Official Number</span>
                    <input 
                      type="text"
                      placeholder="Filter Number"
                      value={filters.officialNumber}
                      onChange={(e) => setFilters({...filters, officialNumber: e.target.value})}
                      className="w-full px-1 py-0.5 text-[11px] font-normal text-slate-700 bg-white border border-slate-200 rounded outline-none"
                    />
                  </div>
                </th>
                <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] w-24 text-center">Remark</th>
                <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] w-24 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="h-10 border border-slate-200 dark:border-slate-700" />
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record, idx) => (
                  <tr key={record.sl} className={`${idx % 2 !== 0 ? "bg-slate-50" : "bg-white"} dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 hover:bg-blue-50/30 transition-colors`}>
                    <td className="p-1 border border-slate-200 dark:border-slate-700 text-[13px] font-medium text-slate-600 text-center">{idx + 1}</td>
                    <td className="p-1 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-700 dark:text-slate-200">{record.userName}</td>
                    <td className="p-1 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-700 dark:text-slate-200 text-center">{record.userPin}</td>
                    <td className="p-1 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-700 dark:text-slate-200 text-center">{record.campusName}</td>
                    <td className="p-1 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-700 dark:text-slate-200 text-center">{record.officialNumber}</td>
                    <td className="p-1 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-700 dark:text-slate-200 text-center">{record.remark}</td>
                    <td className="p-1 border border-slate-200 dark:border-slate-700 text-right">
                      <div className="flex items-center justify-center space-x-1.5">
                         <button 
                            onClick={() => openViewModal(record)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                            title="View details"
                         >
                            <Eye className="w-3.5 h-3.5 shadow-sm" />
                         </button>
                         <button 
                            onClick={() => openEditModal(record)}
                            className="p-1 rounded text-orange-600 hover:bg-orange-50 transition-all cursor-pointer"
                            title="Edit record"
                         >
                            <Edit2 className="w-3.5 h-3.5 shadow-sm" />
                         </button>
                         <button 
                            onClick={() => confirmDelete(record)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Delete record"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={7} className="py-20 text-center border border-slate-200 dark:border-slate-700">
                     <AlertCircle className="w-12 h-12 mx-auto text-slate-200 dark:text-slate-800 mb-2" />
                     <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No infrastructure assets logged</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal Container */}
      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && currentRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[1400px] max-h-[95vh] overflow-hidden bg-white dark:bg-slate-900 rounded-lg shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {isEditModalOpen ? "Modify Asset Record" : "Add New Device"}
                </h3>
                <button 
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Employee Info Section - 4 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-lg">
                   <div className="space-y-1">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">User Name:</label>
                      <input 
                        type="text" 
                        required
                        value={currentRecord.userName || ""}
                        onChange={(e) => setCurrentRecord({...currentRecord, userName: e.target.value})}
                        placeholder="Enter User Name"
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">User Pin:</label>
                      <input 
                        type="text" 
                        required
                        value={currentRecord.userPin || ""}
                        onChange={(e) => setCurrentRecord({...currentRecord, userPin: e.target.value})}
                        placeholder="Enter User Pin"
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Campus Name:</label>
                      <select
                        required
                        value={currentRecord.campusName || ""}
                        onChange={(e) => setCurrentRecord({...currentRecord, campusName: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      >
                        <option value="">Select Campus</option>
                        {campuses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Official Number:</label>
                      <input 
                        type="text" 
                        value={currentRecord.officialNumber || ""}
                        onChange={(e) => setCurrentRecord({...currentRecord, officialNumber: e.target.value})}
                        placeholder="Enter Official Number"
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                   </div>
                </div>

                {/* Devices Table Section */}
                <div className="space-y-2">
                  <h4 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Devices</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
                      <thead>
                        <tr className="bg-[#3498db] text-white">
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[13px] w-10 text-center">SL</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[13px]">Device Type</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[13px]">Configuration</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[13px]">Product Serial</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[13px] w-20">Quantity</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[13px] w-24">Condition</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[13px] w-32">Buying Date</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[13px]">In Whose Name</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[13px] w-32">Collected Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                          const deviceKey = `device${num}` as keyof Partial<DeviceRecord>;
                          const device = (currentRecord[deviceKey] as Device) || { ...EMPTY_DEVICE };
                          const isOdd = num % 2 !== 0;

                          // Filtering logic based on Remark
                          if (currentRecord.remark === "Phone") {
                             if (device.type !== "Mobile" && num !== 2) return null;
                          } else if (currentRecord.remark === "Device") {
                             if (device.type === "Mobile") return null;
                          }
                          
                          return (
                            <tr key={num} className={`${isOdd ? "bg-white" : "bg-slate-50"} dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700`}>
                               <td className="p-0.5 border border-slate-200 dark:border-slate-700 text-center text-[13px] font-medium">{num}</td>
                               <td className="p-0.5 border border-slate-200 dark:border-slate-700">
                                  {num === 1 ? (
                                    <select 
                                       value={device.type || ""}
                                       onChange={(e) => setCurrentRecord({...currentRecord, [deviceKey]: {...device, type: e.target.value}})}
                                       className="w-full px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[13px] outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                      <option value="">Select</option>
                                      {device.type && !assignableDeviceTypes.includes(device.type) && (
                                        <option value={device.type}>{device.type}</option>
                                      )}
                                      {assignableDeviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                  ) : (
                                    <div className="px-1 py-0.5 text-[13px] font-medium text-slate-700 dark:text-slate-300 text-center">
                                      {device.type}
                                    </div>
                                  )}
                               </td>
                               <td className="p-0.5 border border-slate-200 dark:border-slate-700">
                                  <input 
                                    type="text"
                                    value={device.config || ""}
                                    onChange={(e) => setCurrentRecord({...currentRecord, [deviceKey]: {...device, config: e.target.value}})}
                                    className="w-full px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[13px] outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                               </td>
                               <td className="p-0.5 border border-slate-200 dark:border-slate-700">
                                  <input 
                                    type="text"
                                    value={device.serial || ""}
                                    onChange={(e) => setCurrentRecord({...currentRecord, [deviceKey]: {...device, serial: e.target.value}})}
                                    className="w-full px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[13px] outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                               </td>
                               <td className="p-0.5 border border-slate-200 dark:border-slate-700">
                                  <input 
                                    type="text"
                                    value={device.quantity || ""}
                                    onChange={(e) => setCurrentRecord({...currentRecord, [deviceKey]: {...device, quantity: e.target.value}})}
                                    className="w-full px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[13px] text-center outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                               </td>
                               <td className="p-0.5 border border-slate-200 dark:border-slate-700">
                                  <input 
                                    type="text"
                                    value={device.condition || ""}
                                    onChange={(e) => setCurrentRecord({...currentRecord, [deviceKey]: {...device, condition: e.target.value}})}
                                    className="w-full px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[13px] text-center outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                               </td>
                               <td className="p-0.5 border border-slate-200 dark:border-slate-700">
                                  <input 
                                    type="text"
                                    value={device.buyingDate || ""}
                                    onChange={(e) => setCurrentRecord({...currentRecord, [deviceKey]: {...device, buyingDate: e.target.value}})}
                                    className="w-full px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[13px] text-center outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                               </td>
                               <td className="p-0.5 border border-slate-200 dark:border-slate-700">
                                  <input 
                                    type="text"
                                    value={device.purchaseName || ""}
                                    onChange={(e) => setCurrentRecord({...currentRecord, [deviceKey]: {...device, purchaseName: e.target.value}})}
                                    className="w-full px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[13px] outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                               </td>
                               <td className="p-0.5 border border-slate-200 dark:border-slate-700">
                                  <input 
                                    type="text"
                                    value={device.collectedDate || ""}
                                    onChange={(e) => setCurrentRecord({...currentRecord, [deviceKey]: {...device, collectedDate: e.target.value}})}
                                    className="w-full px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-[13px] text-center outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                               </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Indices Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-lg">
                   <div className="space-y-1">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Remark:</label>
                      <select
                        value={currentRecord.remark || ""}
                        onChange={(e) => setCurrentRecord({...currentRecord, remark: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      >
                         <option value="">Select Remark</option>
                         {remarks.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Send to PiLabs Date:</label>
                      <input 
                        type="text" 
                        value={currentRecord.sendToPiLabsDate || ""}
                        onChange={(e) => setCurrentRecord({...currentRecord, sendToPiLabsDate: e.target.value})}
                        placeholder="Enter Send to PiLabs Date DD.MM.YYYY"
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Received from PiLabs Date:</label>
                      <input 
                        type="text" 
                        value={currentRecord.receivedFromPiLabsDate || ""}
                        onChange={(e) => setCurrentRecord({...currentRecord, receivedFromPiLabsDate: e.target.value})}
                        placeholder="Enter Received from PiLabs Date DD.MM.YYYY"
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Room Number:</label>
                      <input 
                        type="text" 
                        value={currentRecord.roomNumber || ""}
                        onChange={(e) => setCurrentRecord({...currentRecord, roomNumber: e.target.value})}
                        placeholder="Enter Room Number"
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                   </div>
                </div>

                <div className="flex justify-center py-4">
                  <button 
                    type="submit"
                    className="px-8 py-2.5 text-sm font-bold bg-[#27ae60] text-white rounded-lg shadow-md hover:bg-[#2ecc71] transition-all cursor-pointer"
                  >
                    {isEditModalOpen ? "Modify Device" : "Add Device"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* View Modal */}
        {isViewModalOpen && currentRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsViewModalOpen(false)}
               className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="relative w-full max-w-[1400px] max-h-[95vh] overflow-hidden bg-white dark:bg-slate-900 rounded shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
             >
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
                   <h3 className="text-[17px] font-bold text-slate-800 dark:text-slate-100 italic">View Device Details</h3>
                   <button onClick={() => setIsViewModalOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X className="w-6 h-6 text-slate-400" />
                   </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
                  {/* User Info Grid */}
                  <div className="grid grid-cols-2 border border-slate-200 dark:border-slate-700">
                    <div className="px-3 py-1.5 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 italic">User Name:</span>
                      <span className="text-[13px] ml-2 text-slate-700 dark:text-slate-400">{currentRecord.userName}</span>
                    </div>
                    <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 italic">User Pin:</span>
                      <span className="text-[13px] ml-2 text-slate-700 dark:text-slate-400">{currentRecord.userPin}</span>
                    </div>
                    <div className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 italic">Campus Name:</span>
                      <span className="text-[13px] ml-2 text-slate-700 dark:text-slate-400">{currentRecord.campusName}</span>
                    </div>
                    <div className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/20">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 italic">Official Number:</span>
                      <span className="text-[13px] ml-2 text-slate-700 dark:text-slate-400">{currentRecord.officialNumber}</span>
                    </div>
                  </div>

                  {/* Devices Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
                      <thead>
                        <tr className="bg-[#3498db] text-white">
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-xs w-10 text-center">SL</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-xs">Device Type</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-xs">Configuration</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-xs">Product Serial</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-xs w-20 text-center">Quantity</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-xs w-20 text-center">Condition</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-xs w-32 text-center">Buying Date</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-xs text-center">Purchase Name</th>
                           <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-xs w-32 text-center">Collected Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                          const deviceKey = `device${num}` as keyof Partial<DeviceRecord>;
                          const device = (currentRecord[deviceKey] as Device) || { ...EMPTY_DEVICE };
                          const isOdd = num % 2 !== 0;

                          // Filtering logic based on Remark
                          if (currentRecord.remark === "Phone") {
                             if (device.type !== "Mobile" && num !== 2) return null;
                          } else if (currentRecord.remark === "Device") {
                             if (device.type === "Mobile") return null;
                          }
                          
                          return (
                            <tr key={num} className={`${isOdd ? "bg-white" : "bg-slate-50"} dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700`}>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-center text-xs font-medium">{num}</td>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">{device.type}</td>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">{device.config}</td>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">{device.serial}</td>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-xs text-center text-slate-700 dark:text-slate-300">{device.quantity || (device.type ? "1" : "-")}</td>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-xs text-center text-slate-700 dark:text-slate-300">{device.condition || (device.type ? "Good" : "-")}</td>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-xs text-center text-slate-700 dark:text-slate-300">{device.buyingDate ? `Approx: ${device.buyingDate}` : ""}</td>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-xs text-center text-slate-700 dark:text-slate-300">{device.purchaseName}</td>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-xs text-center text-slate-700 dark:text-slate-300">{device.collectedDate}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Info Grid */}
                  <div className="grid grid-cols-2 border border-slate-200 dark:border-slate-700">
                    <div className="px-3 py-1.5 border-r border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 italic">Remark:</span>
                      <span className="text-[13px] ml-2 text-slate-700 dark:text-slate-400">{currentRecord.remark}</span>
                    </div>
                    <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 italic">Send to PiLabs Date:</span>
                      <span className="text-[13px] ml-2 text-slate-700 dark:text-slate-400">{currentRecord.sendToPiLabsDate}</span>
                    </div>
                    <div className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 italic">Received from PiLabs Date:</span>
                      <span className="text-[13px] ml-2 text-slate-700 dark:text-slate-400">{currentRecord.receivedFromPiLabsDate}</span>
                    </div>
                    <div className="px-3 py-1.5">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 italic">Room Number:</span>
                      <span className="text-[13px] ml-2 text-slate-700 dark:text-slate-400">{currentRecord.roomNumber}</span>
                    </div>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
        {/* Summary Modal */}
        {isSummaryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsSummaryModalOpen(false)}
               className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="relative w-full max-w-[1400px] overflow-hidden bg-white dark:bg-slate-900 rounded shadow-2xl border border-slate-200 dark:border-slate-800 p-4"
             >
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-[17px] font-bold text-slate-800 dark:text-slate-100">Device Summary</h3>
                   <button onClick={() => setIsSummaryModalOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X className="w-6 h-6 text-slate-400" />
                   </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
                    <thead>
                        <tr className="bg-[#3498db] text-white">
                          <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] w-10 text-center">SL</th>
                          <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] text-center min-w-[150px]">Campus Name</th>
                          {allDeviceTypes.map(t => (
                            <th key={t} className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] text-center">{t}</th>
                          ))}
                          <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] text-center">Device Phone</th>
                          <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] text-center">Device</th>
                          <th className="p-1 border border-slate-300 dark:border-slate-600 font-bold text-[11px] text-center">Phone</th>
                       </tr>
                    </thead>
                    <tbody>
                       {campuses.map((campus, idx) => {
                         const campusRecords = records.filter(r => r.campusName === campus);
                         return (
                            <tr key={campus} className="hover:bg-slate-50 transition-colors">
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-center">{idx + 1}</td>
                               <td className="p-1 border border-slate-200 dark:border-slate-700 text-[11px] font-medium">{campus}</td>
                               {allDeviceTypes.map(type => {
                                 const count = campusRecords.reduce((total, record) => {
                                   let subTotal = 0;
                                   for (let i = 1; i <= 8; i++) {
                                      const d = record[`device${i}` as keyof DeviceRecord] as Device;
                                      if (d?.type === type) subTotal += 1;
                                   }
                                   return total + subTotal;
                                 }, 0);
                                 return <td key={type} className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-[12px] text-center font-medium">{count || ""}</td>
                               })}
                               <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-[12px] text-center font-medium">
                                 {campusRecords.filter(r => r.remark === "Device+Phone").length || ""}
                               </td>
                               <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-[12px] text-center font-medium">
                                 {campusRecords.filter(r => r.remark === "Device").length || ""}
                               </td>
                               <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-[12px] text-center font-medium">
                                 {campusRecords.filter(r => r.remark === "Phone").length || ""}
                               </td>
                            </tr>
                         );
                       })}
                    </tbody>
                    <tfoot className="bg-[#3498db] text-white">
                       <tr className="font-bold">
                          <td className="p-0.5 border border-slate-300 dark:border-slate-600 text-center text-[11px]">{campuses.length + 1}</td>
                          <td className="p-0.5 border border-slate-300 dark:border-slate-600 text-center text-[11px]">Total</td>
                          {allDeviceTypes.map(type => {
                            const count = records.reduce((total, record) => {
                               let subTotal = 0;
                               for (let i = 1; i <= 8; i++) {
                                  const d = record[`device${i}` as keyof DeviceRecord] as Device;
                                  if (d?.type === type) subTotal += 1;
                               }
                               return total + subTotal;
                            }, 0);
                            return <td key={type} className="p-0.5 border border-slate-300 dark:border-slate-600 text-center text-[11px]">{count}</td>
                          })}
                          <td className="p-0.5 border border-slate-300 dark:border-slate-600 text-center text-[11px]">
                             {records.filter(r => r.remark === "Device+Phone").length}
                          </td>
                          <td className="p-0.5 border border-slate-300 dark:border-slate-600 text-center text-[11px]">
                             {records.filter(r => r.remark === "Device").length}
                          </td>
                          <td className="p-0.5 border border-slate-300 dark:border-slate-600 text-center text-[11px]">
                             {records.filter(r => r.remark === "Phone").length}
                          </td>
                       </tr>
                    </tfoot>
                  </table>
                </div>
             </motion.div>
          </div>
        )}

        {/* Export Modal */}
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsExportModalOpen(false)}
               className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-slate-900 rounded shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
             >
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
                   <h3 className="text-[17px] font-bold text-slate-800 dark:text-slate-100 italic">Configure Export Columns</h3>
                   <button onClick={() => setIsExportModalOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X className="w-6 h-6 text-slate-400" />
                   </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6 max-h-[70vh]">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tighter">Selected Columns (Move to reorder)</p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setExportColumns(exportColumns.map(c => ({...c, selected: true})))}
                          className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <button 
                          onClick={() => setExportColumns(exportColumns.map(c => ({...c, selected: false})))}
                          className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                   </div>

                   <div className="space-y-1">
                      {exportColumns.map((col, index) => (
                        <div 
                          key={col.id} 
                          className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${col.selected ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm" : "bg-slate-50/50 dark:bg-slate-950/20 border-transparent opacity-60"}`}
                        >
                           <button 
                             type="button"
                             onClick={() => toggleColumnSelection(col.id)}
                             className={`flex-shrink-0 transition-colors cursor-pointer ${col.selected ? "text-blue-600" : "text-slate-300"}`}
                           >
                             {col.selected ? <CheckSquare className="w-5 h-5 fill-blue-500/10" /> : <Square className="w-5 h-5" />}
                           </button>
                           
                           <div className="flex-1 min-w-0">
                              <span className={`text-[13px] font-bold truncate block ${col.selected ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}`}>
                                {col.label}
                              </span>
                              {col.id.includes("device") && (
                                <span className="text-[9px] text-slate-400 uppercase font-medium">Hardware Index</span>
                              )}
                           </div>

                           <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700">
                              <button 
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveColumn(index, "up")}
                                className={`p-1 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all ${index === 0 ? "opacity-20 cursor-not-allowed" : "text-slate-600 dark:text-slate-300 cursor-pointer"}`}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                              <button 
                                type="button"
                                disabled={index === exportColumns.length - 1}
                                onClick={() => handleMoveColumn(index, "down")}
                                className={`p-1 rounded hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all ${index === exportColumns.length - 1 ? "opacity-20 cursor-not-allowed" : "text-slate-600 dark:text-slate-300 cursor-pointer"}`}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-center">
                   <button 
                      onClick={executeExport}
                      className="px-8 py-2.5 text-sm font-bold bg-[#3498db] text-white rounded shadow-md hover:bg-[#2980b9] transition-all cursor-pointer flex items-center gap-2"
                   >
                      <Download className="w-4 h-4" />
                      Download Device Data
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Status Toasts */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-3 border ${
              statusMessage.type === "success" 
                ? "bg-emerald-600 border-emerald-500 text-white" 
                : "bg-rose-600 border-rose-500 text-white"
            }`}
          >
            {statusMessage.type === "success" ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-xs font-bold tracking-tight">{statusMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Custom Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                 <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/30 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Record?</h3>
                 <p className="text-sm text-slate-500">Are you sure you want to delete this device record? This action cannot be undone.</p>
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={() => setIsDeleteConfirmOpen(false)}
                   className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleDeleteDevice}
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
