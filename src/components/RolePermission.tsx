import React, { useState, useEffect } from "react";
import { User, RolePermissions } from "../types";
import { ShieldCheck, Check, Loader2, Save, RefreshCw, HelpCircle, Lock, Database, Globe, UploadCloud, User as UserIcon, Search, AlertCircle, X } from "lucide-react";

interface RolePermissionProps {
  currentUser: User;
  onPermissionsUpdated?: () => void;
}

export default function RolePermission({ currentUser, onPermissionsUpdated }: RolePermissionProps) {
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Google Sheets Apps Script integration states
  const [appscriptUrl, setAppscriptUrl] = useState("");
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showLoginInstructions, setShowLoginInstructions] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // User Specific Permissions (Wish Permissions) states
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchText, setUserSearchText] = useState("");
  const [userCustomPermissions, setUserCustomPermissions] = useState<string[]>([]);
  const [isSavingUserPerms, setIsSavingUserPerms] = useState(false);

  const roles = ["Super Admin", "Admin", "User"];
  
  // Fully described capabilities mapping
  const MODULE_CAPABILITIES = [
    { key: "my_profile", label: "My Profile", desc: "View your personal profile details." },
    { key: "enter_workflow", label: "Enter Workflow", desc: "Access the dynamic workflow entry logging portal." },
    { key: "history_workflow", label: "History Workflow", desc: "Browse, search, sort and view historical logs." },
    { key: "filter_workflow", label: "Filter Workflow", desc: "Run advanced multi-attribute user audits." },
    { key: "user_management", label: "User Management", desc: "Introduce, supervise active status and delete user accounts." },
    { key: "attendance_report", label: "Workflow Report", desc: "Interact with workload analytical chart aggregates." },
    { key: "attendance_grid_report", label: "Attendance Report", desc: "View the monthly user attendance and presence grid table." },
    { key: "member_responsibility", label: "Member Responsibility", desc: "Configure monthly-wise active user responsibility and presence tables." },
    { key: "device_management", label: "Device Management", desc: "Manage hardware inventory and allocated devices." },
    { key: "role_permission", label: "Role Permission", desc: "Configure access privilege tables permanently." },
  ];

  const fetchPermissions = async () => {
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const res = await fetch("/api/permissions");
      const body = await res.json();
      if (body.success) {
        setPermissions(body.data || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.data) {
        setShowLoginInstructions(data.data.showLoginInstructions !== false);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const fetchSheetsConfig = async () => {
    try {
      const res = await fetch("/api/sheets/config");
      const data = await res.json();
      if (data.success) {
        setAppscriptUrl(data.appscriptUrl);
      }
    } catch (err) {
      console.error("Failed to load Sheets config:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setAllUsers(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch users for permissions mapping");
    }
  };

  useEffect(() => {
    fetchPermissions();
    fetchSheetsConfig();
    fetchSettings();
    fetchUsers();
  }, []);

  const toggleLoginInstructions = async () => {
    if (isUpdatingSettings) return;
    setIsUpdatingSettings(true);
    const newValue = !showLoginInstructions;
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { showLoginInstructions: newValue } }),
      });
      const data = await res.json();
      if (data.success) {
        setShowLoginInstructions(newValue);
        setSuccessMessage("Login page instructions updated successfully.");
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(data.error || "Failed to update instructions toggle.");
      }
    } catch (err) {
      setErrorMessage("Network issue occurred while updating settings.");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const saveSheetsConfig = async () => {
    if (isSavingUrl) return;
    setIsSavingUrl(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/sheets/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appscriptUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({ type: "success", text: "Apps Script Deployment URL saved successfully and live background synchronization is active!" });
        setTimeout(() => setSyncFeedback(null), 6000);
      } else {
        setSyncFeedback({ type: "error", text: data.error || "Failed to save Apps Script URL." });
      }
    } catch (err) {
      setSyncFeedback({ type: "error", text: "Error connecting to backend services." });
    } finally {
      setIsSavingUrl(false);
    }
  };

  const handleManualSyncAll = async () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/sheets/sync-all", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({
          type: "success",
          text: `Success! ${data.message}`,
        });
      } else {
        setSyncFeedback({
          type: "error",
          text: data.error || "Synchronization pipeline returned an error structure.",
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: "error",
        text: "Bulk transmission failed due to response timeout. Your dataset might be too large; check your spreadsheet.",
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCheckboxToggle = (role: string, moduleKey: string) => {
    if (!permissions) return;

    // Super Admin cannot drop self role-permissions tab (safety against self locking)
    if (role === "Super Admin" && moduleKey === "role_permission") {
      alert("Super Admins cannot detach the 'Role Permission' privilege to prevent system locks.");
      return;
    }

    const rolePerms = [...(permissions[role] || [])];
    const isChecked = rolePerms.includes(moduleKey);

    let updatedPerms;
    if (isChecked) {
      updatedPerms = rolePerms.filter((k) => k !== moduleKey);
    } else {
      updatedPerms = [...rolePerms, moduleKey];
    }

    setPermissions({
      ...permissions,
      [role]: updatedPerms,
    });
  };

  const savePermissions = async () => {
    if (!permissions || isSaving) return;

    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const body = await res.json();

      if (body.success) {
        setSuccessMessage("Operational privileges synchronized successfully.");
        if (onPermissionsUpdated) {
          onPermissionsUpdated();
        }
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(body.error || "Save action denied.");
      }
    } catch (e) {
      setErrorMessage("Network issue occurred while saving privileges.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserCustomPermissions(user.customPermissions || []);
    setUserSearchText("");
  };

  const handleUserCheckboxToggle = (moduleKey: string) => {
    setUserCustomPermissions(prev => 
      prev.includes(moduleKey) 
        ? prev.filter(k => k !== moduleKey) 
        : [...prev, moduleKey]
    );
  };

  const saveUserPermissions = async () => {
    if (!selectedUser || isSavingUserPerms) return;
    setIsSavingUserPerms(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/users/${selectedUser.pin}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: userCustomPermissions }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Custom privileges synchronized for ${selectedUser.name}!`);
        // Update local user list to reflect changes
        setAllUsers(prev => prev.map(u => u.pin === selectedUser.pin ? { ...u, customPermissions: userCustomPermissions } : u));
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        setErrorMessage(data.error || "Failed to update user privileges.");
      }
    } catch (e) {
      setErrorMessage("Network issue occurred while saving user privileges.");
    } finally {
      setIsSavingUserPerms(false);
    }
  };

  const filteredUsers = userSearchText.trim().length > 0 
    ? allUsers.filter(u => 
        u.name.toLowerCase().includes(userSearchText.toLowerCase()) || 
        u.pin.includes(userSearchText)
      ).slice(0, 5)
    : [];

  if (isLoading || !permissions) {
    return (
      <div className="p-16 text-center space-y-2">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-slate-500 text-xs font-medium">Loading security descriptors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      
      {/* Intro section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Role Permission Workspace</h2>
          <p className="text-[11px] text-slate-500">
            Define system capabilities, restrict URL workflows, prevent role escalation and synchronize script credentials.
          </p>
        </div>

        <button
          onClick={savePermissions}
          disabled={isSaving}
          className="inline-flex items-center space-x-1 px-3 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-sm cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save System Access Privileges</span>
            </>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{successMessage} &bull; Dashboard menu configurations have been synchronized.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* User Wish Permissions Section (New) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
             <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-600">
               <UserIcon className="w-5 h-5" />
             </div>
             <div>
               <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">User Wish Permissions (Individual Overrides)</h3>
               <p className="text-[11px] text-slate-500 mt-0.5">
                 Assign specific module access to an individual user that is independent of their inherited role scope.
               </p>
             </div>
          </div>
          {selectedUser && (
            <button
              onClick={() => setSelectedUser(null)}
              className="p-1 px-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear Selection
            </button>
          )}
        </div>

        {!selectedUser ? (
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
               <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search user by PIN or Name to assign individual privileges..."
              value={userSearchText}
              onChange={(e) => setUserSearchText(e.target.value)}
              className="pl-9 pr-4 py-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-xs font-medium"
            />
            {filteredUsers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map(u => (
                  <button
                    key={u.pin}
                    onClick={() => handleUserSelect(u)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{u.name}</p>
                      <p className="text-[10px] text-slate-500">PIN: {u.pin} • Role: {u.role}</p>
                    </div>
                    <Check className="w-4 h-4 text-orange-500 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
            {userSearchText.trim() !== "" && filteredUsers.length === 0 && (
               <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-center z-20">
                  <p className="text-xs text-slate-400">No matching user records found.</p>
               </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-xl p-3">
               <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-700 dark:text-orange-400 font-bold text-sm uppercase">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{selectedUser.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">PIN: {selectedUser.pin} | Role: {selectedUser.role}</p>
                  </div>
               </div>

               <button
                 onClick={saveUserPermissions}
                 disabled={isSavingUserPerms}
                 className="px-4 py-1.5 rounded-lg font-bold bg-orange-600 hover:bg-orange-700 text-white text-[11px] shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
               >
                 {isSavingUserPerms ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                 Apply Custom Privileges
               </button>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-2 uppercase font-bold text-[10px] text-slate-500">Module Segment</th>
                        <th className="px-4 py-2 uppercase font-bold text-[10px] text-center text-slate-500">Individual Grant</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {MODULE_CAPABILITIES.map(cap => {
                        const isGrantedByRole = (permissions[selectedUser.role] || []).includes(cap.key);
                        const isGrantedIndividually = userCustomPermissions.includes(cap.key);
                        
                        return (
                          <tr key={cap.key} className="hover:bg-white dark:hover:bg-slate-900 transition-colors">
                            <td className="px-4 py-2">
                               <div className="flex items-center gap-2">
                                  <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px]">{cap.label}</p>
                                    <p className="text-[9.5px] text-slate-400">{cap.desc}</p>
                                  </div>
                                  {isGrantedByRole && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-bold uppercase tracking-wider">
                                       Role Inherited
                                    </span>
                                  )}
                               </div>
                            </td>
                            <td className="px-4 py-2">
                               <div className="flex justify-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isGrantedIndividually}
                                      onChange={() => handleUserCheckboxToggle(cap.key)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:after:bg-slate-400 peer-checked:bg-orange-500"></div>
                                  </label>
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid presentation */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-1.5 uppercase font-semibold text-slate-500 text-[10px]">Module Segment</th>
                {roles.map((r) => (
                  <th key={r} className="px-3 py-1.5 uppercase font-bold text-center text-slate-500 text-[10px]">{r} Scope</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {MODULE_CAPABILITIES.map((cap) => (
                <tr key={cap.key} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/10 transition-colors">
                  <td className="px-3 py-1.5">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">{cap.label}</p>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">{cap.desc}</p>
                  </td>
                  {roles.map((r) => {
                    const isChecked = (permissions[r] || []).includes(cap.key);
                    const isLocked = r === "Super Admin" && cap.key === "role_permission";

                    return (
                      <td key={r} className="px-3 py-1.5 text-center">
                        <div className="flex justify-center">
                          {isLocked ? (
                            <div className="p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400" title="Mandatory lock">
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleCheckboxToggle(r, cap.key)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:after:bg-slate-400 peer-checked:bg-blue-600"></div>
                            </label>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advisory Note */}
      <div className="bg-slate-50 dark:bg-slate-950/40 rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-start space-x-1.5">
        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Security Assertion Policy</p>
          <p className="leading-normal">
            Changing these configuration parameters triggers an instant update. Users will have their dynamically available navigation items updated immediately during their next API call or page reload session.
          </p>
        </div>
      </div>

      {/* Login Preferences Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Login Page Preferences</h3>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Enable or disable the login instructions panel on the authentication screen for all users.
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`text-[11px] font-bold ${showLoginInstructions ? 'text-emerald-500' : 'text-slate-400'}`}>
              {showLoginInstructions ? "Instructions ON" : "Instructions OFF"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showLoginInstructions}
                onChange={toggleLoginInstructions}
                disabled={isUpdatingSettings}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-slate-400 peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Google Sheets Sync & Apps Script Configuration Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm space-y-3">
        <div className="flex items-start space-x-2.5">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Google Sheets Integration Panel</h3>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              Sync real-time work logs, responsibility allocations, and active worker accounts with your spreadsheet database via the deployed Apps Script URL.
            </p>
          </div>
        </div>

        {syncFeedback && (
          <div className={`p-2.5 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5 ${
            syncFeedback.type === "success" 
              ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400" 
              : "bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400"
          }`}>
            {syncFeedback.type === "success" ? <ShieldCheck className="w-4.5 h-4.5 shrink-0" /> : <Lock className="w-4.5 h-4.5 shrink-0" />}
            <span className="leading-normal">{syncFeedback.text}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1 bh-title">
              Connected Apps Script API URL
            </label>
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950/50 border border-slate-205 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-350 font-mono">
              <span className="truncate max-w-[280px] sm:max-w-xl" title={appscriptUrl || "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec"}>
                {appscriptUrl || "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec"}
              </span>
              <span className="shrink-0 text-[9px] font-bold uppercase text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded leading-none ml-2">
                System Managed
              </span>
            </div>
            <p className="text-[9.5px] text-slate-400 mt-1.5 leading-relaxed">
              * Note: The system automatically synchronizes the "Users" list in real-time immediately when the Login page loads. No manual configuration is required.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Manual Database Force-Push</h4>
              <p className="text-[9.5px] text-slate-400">Upload all locally saved user records and monthly workflow tables to Google Sheet spreadsheets right now.</p>
            </div>

            <button
              onClick={handleManualSyncAll}
              disabled={isSyncingAll}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg font-bold bg-amber-600 hover:bg-amber-700 text-white text-[11px] shadow-sm cursor-pointer disabled:bg-slate-300 dark:disabled:bg-slate-800/80 dark:disabled:text-slate-500 whitespace-nowrap"
            >
              {isSyncingAll ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin spin-slow" />
                  <span>Pushing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>SYNC / EXPORT APP STATE</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
