import React, { useState, useEffect } from "react";
import { User } from "../types";
import { safeSessionStorage } from "../storage";
import { Plus, Edit2, Trash2, ShieldCheck, Check, X, ToggleLeft, ToggleRight, Search, Landmark, UserPlus, RefreshCw, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";

interface UserManagementProps {
  currentUser: User;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Editor States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPin, setEditingPin] = useState<string | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formRole, setFormRole] = useState("User");
  const [formCampus, setFormCampus] = useState("");
  const [formStatus, setFormStatus] = useState("Active");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Retrieve user directory lists
  const fetchUsers = async (background = true) => {
    if (!background) {
      const cached = safeSessionStorage.getItem("wms_cache_users_all");
      if (cached) {
        setUsers(JSON.parse(cached));
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }

    try {
      const res = await fetch("/api/users");
      const body = await res.json();
      if (body.success) {
        setUsers(body.data || []);
        safeSessionStorage.setItem("wms_cache_users_all", JSON.stringify(body.data || []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(false);
  }, []);

  const clearForm = () => {
    setFormName("");
    setFormPin("");
    setFormRole("User");
    setFormCampus("");
    setFormStatus("Active");
    setEditingPin(null);
    setIsEditing(false);
    setErrorMessage("");
  };

  const handleAddOrEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formName || !formPin || !formCampus) {
      setErrorMessage("Please fill all mandatory property inputs.");
      return;
    }

    const payload = {
      name: formName.trim(),
      pin: formPin.trim(),
      role: formRole,
      campus: formCampus.trim(),
      status: formStatus
    };

    try {
      let res;
      if (isEditing && editingPin) {
        res = await fetch(`/api/users/${editingPin}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const body = await res.json();
      if (body.success) {
        setSuccessMessage(isEditing ? "Profile updated successfully." : "New user successfully introduced.");
        clearForm();
        setIsModalOpen(false);
        fetchUsers();
        // Clear message after timer
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(body.error || "Action could not be executed.");
      }
    } catch (err) {
      setErrorMessage("Network operations error. Please re-check host.");
    }
  };

  const startEdit = (user: User) => {
    setIsEditing(true);
    setEditingPin(user.pin);
    setFormName(user.name);
    setFormPin(user.pin);
    setFormRole(user.role);
    setFormCampus(user.campus);
    setFormStatus(user.status);
    setIsModalOpen(true);
  };

  const toggleStatus = async (user: User) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/users/${user.pin}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await res.json();
      if (body.success) {
        setSuccessMessage(`User status toggled to ${nextStatus}.`);
        fetchUsers();
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = (user: User) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to permanently delete ${user.name}? This will purge all associated workflow history locally and from Google Sheets!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "No, Keep"
    }).then((result) => {
      if (result.isConfirmed) {
        confirmDeleteUser(user);
      }
    });
  };

  const confirmDeleteUser = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.pin}`, {
        method: "DELETE"
      });
      const body = await res.json();
      if (body.success) {
        Swal.fire({
          icon: "success",
          title: "Purged!",
          text: "User profile has been deleted successfully.",
          timer: 2000,
          showConfirmButton: false
        });
        fetchUsers();
      } else {
        Swal.fire("Error", body.error || "Failed to delete user.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Network communication failure.", "error");
    }
  };

  const filteredUsers = users.filter((u) => {
    return u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.campus.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.pin.includes(searchQuery) ||
           u.role.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-3 relative">
      
      {/* Introduction Banner header with Add User button on top right */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">User Administration & Registry</h2>
          <p className="text-[11px] text-slate-500">
            Supervise user directories, grant analytical roles, manage campus distributions and toggle authentication states.
          </p>
        </div>
        <button
          onClick={() => {
            clearForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow shadow-blue-600/10 cursor-pointer select-none transition-colors shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-3 rounded-lg shadow-xl text-xs bg-emerald-500 text-white flex items-center space-x-2 font-bold translate-y-0">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Directory table and interactive list (Full width / Full Body) */}
      <div className="space-y-3 w-full">
        
        {/* Search header panel */}
        <div className="flex items-center space-x-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search user record directories (Name, Campus, PIN, Role)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full outline-none text-xs bg-transparent text-slate-800 dark:text-slate-100"
          />
          <button
            onClick={fetchUsers}
            className="shrink-0 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer transition-colors"
            title="Refresh User List"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Directory details registry grid / table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-xs">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 font-medium">
              Fetching Enterprise Registries...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No matched user files are registered.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase">

                    <th className="p-1">Employee Context</th>
                    <th className="p-1">PIN Key</th>
                    <th className="p-1">Assigned Role</th>
                    <th className="p-1">Campus Sector</th>
                    <th className="p-1">Status</th>
                    <th className="p-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.pin} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                      <td className="p-1">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{user.name}</p>
                      </td>
                      <td className="p-1 text-xs font-mono text-slate-500">
                        {user.pin}
                      </td>
                      <td className="p-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          user.role === "Super Admin" 
                            ? "bg-rose-500/10 text-rose-500" 
                            : user.role === "Admin" 
                              ? "bg-amber-500/10 text-amber-500" 
                              : "bg-blue-500/10 text-blue-600"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-1 font-medium text-slate-500 dark:text-slate-350">{user.campus}</td>
                      <td className="p-1">
                        <button
                          onClick={() => toggleStatus(user)}
                          className="inline-flex items-center space-x-1 hover:opacity-85 transition-opacity cursor-pointer text-left"
                          title={`Click to toggle user status to ${user.status === "Active" ? "Inactive" : "Active"}`}
                        >
                          {user.status === "Active" ? (
                            <span className="flex items-center text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded text-[10px]">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="flex items-center text-slate-400 font-bold bg-slate-50 dark:bg-slate-950/20 px-1.5 py-0.5 rounded text-[10px]">
                              <span className="w-1 h-1 rounded-full bg-slate-400 mr-1"></span>
                              <span>Inactive</span>
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="p-1 text-right font-medium">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit user details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteUser(user)}
                            disabled={currentUser.pin === user.pin}
                            className={`p-1 rounded transition-colors ${
                              currentUser.pin === user.pin
                                ? "text-slate-200 dark:text-slate-800 cursor-not-allowed opacity-40"
                                : "text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            }`}
                            title={currentUser.pin === user.pin ? "You cannot self delete" : "Delete user profile"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Add / Edit Input Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xl max-w-sm w-full space-y-3 relative animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={() => {
                setIsModalOpen(false);
                clearForm();
              }}
              className="absolute right-3.5 top-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>{isEditing ? "Edit User Record" : "Add Employee Profile"}</span>
            </h3>

            <form onSubmit={handleAddOrEditUser} className="space-y-3 text-xs font-medium text-slate-700 dark:text-slate-300">
              
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Full Employee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nazmul Alam"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-600 font-normal text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Secure PIN Code (Key-credential)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. 2653"
                  value={formPin}
                  disabled={isEditing}
                  onChange={(e) => setFormPin(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-600 font-mono text-xs text-slate-800 dark:text-slate-100 ${isEditing ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900" : ""}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Assigned Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-1 focus:ring-blue-600 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Access Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-1 focus:ring-blue-600 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Workplace Campus Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Motijheel ESM"
                  value={formCampus}
                  onChange={(e) => setFormCampus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-1 focus:ring-blue-600 font-normal text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Error log alert */}
              {errorMessage && (
                <div className="p-2 rounded text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-semibold flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    clearForm();
                  }}
                  className="w-1/2 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow cursor-pointer transition-colors"
                >
                  {isEditing ? "Apply Change" : "Save User"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
