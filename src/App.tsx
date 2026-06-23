import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import EnterWorkflow from "./components/EnterWorkflow";
import HistoryWorkflow from "./components/HistoryWorkflow";
import FilterWorkflow from "./components/FilterWorkflow";
import UserManagement from "./components/UserManagement";
import AttendanceReport from "./components/AttendanceReport";
import AttendanceGridReport from "./components/AttendanceGridReport";
import RolePermission from "./components/RolePermission";
import DownloadWorkflow from "./components/DownloadWorkflow";
import MemberResponsibility from "./components/MemberResponsibility";
import DeviceManagement from "./components/DeviceManagement";
import MyProfile from "./components/MyProfile";
import { User } from "./types";
import { safeLocalStorage } from "./storage";
import { 
  PlusCircle, 
  History, 
  Filter, 
  Users, 
  BarChart3, 
  Download, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  UserCircle2,
  Calendar,
  Briefcase,
  Monitor
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("my_profile");
  const [allowedPermissions, setAllowedPermissions] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Read preference on load
    const saved = safeLocalStorage.getItem("wms_dark_mode");
    return saved === "true";
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load existing session from localStorage to prevent auth loss on reload
  useEffect(() => {
    try {
      const savedSession = safeLocalStorage.getItem("wms_session");
      const savedPerms = safeLocalStorage.getItem("wms_permissions");
      if (savedSession && savedPerms) {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
        setAllowedPermissions(JSON.parse(savedPerms));

        // Default to the first permitted tab
        const perms: string[] = JSON.parse(savedPerms);
        if (perms.length > 0) {
          setActiveTab(perms[0]);
        }

        // Fetch updated permission map right away to catch any configuration changes
        fetch(`/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: user.pin })
        })
          .then(res => res.json())
          .then(body => {
            if (body.success && body.permissions) {
              setAllowedPermissions(body.permissions);
              safeLocalStorage.setItem("wms_permissions", JSON.stringify(body.permissions));
            }
          })
          .catch(err => console.warn("Could not sync permissions at boot:", err));
      }
    } catch (e) {
      console.error("Session restoration failed:", e);
    }
  }, []);

  // Update theme helper class on wrap
  useEffect(() => {
    safeLocalStorage.setItem("wms_dark_mode", String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLoginSuccess = (user: User, perms: string[]) => {
    setCurrentUser(user);
    setAllowedPermissions(perms);
    safeLocalStorage.setItem("wms_session", JSON.stringify(user));
    safeLocalStorage.setItem("wms_permissions", JSON.stringify(perms));
    
    // Auto route to first permitted module tab
    if (perms.length > 0) {
      setActiveTab(perms[0]);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAllowedPermissions([]);
    safeLocalStorage.removeItem("wms_session");
    safeLocalStorage.removeItem("wms_permissions");
    setActiveTab("my_profile");
  };

  // Synchronize available menu descriptors if permission matrix changes in superadmin view
  const fetchUpdatedPermissions = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: currentUser.pin })
      });
      const body = await res.json();
      if (body.success) {
        setAllowedPermissions(body.permissions);
        safeLocalStorage.setItem("wms_permissions", JSON.stringify(body.permissions));
      }
    } catch (e) {
      console.warn("Could not resync permission matrices in background", e);
    }
  };

  // Helper for user initials in professional avatar UI
  const getInitials = (name: string) => {
    if (!name) return "US";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Standard static mapping for navigation items
  const NAVIGATION_MAP = [
    { key: "my_profile", label: "My Profile", icon: UserCircle2 },
    { key: "enter_workflow", label: "Enter Workflow", icon: PlusCircle },
    { key: "history_workflow", label: "History Workflow", icon: History },
    { key: "filter_workflow", label: "Filter Workflow", icon: Filter },
    { key: "user_management", label: "User Management", icon: Users },
    { key: "attendance_report", label: "Workflow Report", icon: BarChart3 },
    { key: "attendance_grid_report", label: "Attendance Report", icon: Calendar },
    { key: "member_responsibility", label: "Member Responsibility", icon: Briefcase },
    { key: "device_management", label: "Device Management", icon: Monitor },
    { key: "role_permission", label: "Role Permission", icon: ShieldAlert },
  ];

  // Filtering visible navigation sidebar triggers based on user RBAC permissions
  const activeNavigationItems = NAVIGATION_MAP.filter((item) =>
    allowedPermissions.includes(item.key)
  );

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Render Component View based on Selected Menu Tab
  const renderTabContent = () => {
    if (!currentUser) return null;

    if (activeTab === "my_profile" && allowedPermissions.includes("my_profile")) {
      return <MyProfile currentUser={currentUser} />;
    }
    if (activeTab === "enter_workflow" && allowedPermissions.includes("enter_workflow")) {
      return <EnterWorkflow currentUser={currentUser} />;
    }
    if (activeTab === "history_workflow" && allowedPermissions.includes("history_workflow")) {
      return <HistoryWorkflow currentUser={currentUser} />;
    }
    if (activeTab === "filter_workflow" && allowedPermissions.includes("filter_workflow")) {
      return <FilterWorkflow currentUser={currentUser} />;
    }
    if (activeTab === "user_management" && allowedPermissions.includes("user_management")) {
      return <UserManagement currentUser={currentUser} />;
    }
    if (activeTab === "attendance_report" && allowedPermissions.includes("attendance_report")) {
      return <AttendanceReport currentUser={currentUser} />;
    }
    if (activeTab === "attendance_grid_report" && allowedPermissions.includes("attendance_grid_report")) {
      return <AttendanceGridReport currentUser={currentUser} />;
    }
    if (activeTab === "member_responsibility" && allowedPermissions.includes("member_responsibility")) {
      return <MemberResponsibility currentUser={currentUser} />;
    }
    if (activeTab === "device_management" && allowedPermissions.includes("device_management")) {
      return <DeviceManagement currentUser={currentUser} />;
    }
    if (activeTab === "role_permission" && allowedPermissions.includes("role_permission")) {
      return <RolePermission currentUser={currentUser} onPermissionsUpdated={fetchUpdatedPermissions} />;
    }

    return (
      <div className="p-12 text-center text-slate-500">
        ⚠️ Unauthorized tab access or disabled module.
      </div>
    );
  };

  // Auth gate check
  if (!currentUser) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        isDarkMode={isDarkMode} 
        onThemeToggle={toggleTheme} 
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Container wrapper Layout */}
      <div className="flex h-screen overflow-hidden">
        
        {/* ================= SIDEBAR ================= */}
        {/* Desktop Sidebar menu list */}
        <aside className={`hidden md:flex flex-col w-64 border-r shrink-0 transition-colors duration-200 ${
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}>
          
          {/* Logo brand branding */}
          <div className={`h-16 flex items-center px-6 border-b gap-3 ${
            isDarkMode ? "border-slate-800" : "border-slate-200"
          }`}>
            <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-600/20 text-white font-bold text-base font-display">
              W
            </div>
            <div>
              <span className={`font-bold tracking-tight text-base font-display ${
                isDarkMode ? "text-white" : "text-slate-800"
              }`}>Workflow ESM</span>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest font-sans">Working Log</p>
            </div>
          </div>

          {/* Navigation Items list */}
          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto mt-2">
            <span className="block text-[10px] uppercase tracking-widest font-bold text-slate-400/60 mb-2 px-3">
              Application Modules
            </span>
            {activeNavigationItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/10"
                      : isDarkMode
                        ? "text-slate-400 hover:text-white hover:bg-slate-800"
                        : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout segment & Profile */}
          <div className={`p-2 border-t mt-auto ${
            isDarkMode ? "border-slate-800" : "border-slate-100"
          }`}>
            <div className={`mb-1 p-1.5 rounded-lg flex items-center space-x-2 ${
               isDarkMode ? "bg-slate-800/40" : "bg-slate-50/50"
            }`}>
              <div className="h-7 w-7 bg-slate-700 rounded-full flex items-center justify-center text-[10px] text-white border border-slate-600 font-bold shrink-0">
                {getInitials(currentUser.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-bold text-[10px] truncate ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  {currentUser.name}
                </p>
                <p className="text-[8px] text-slate-500 truncate">{currentUser.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 h-7 w-7 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors shrink-0"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </aside>

        {/* ================= MOBILE NAVIGATION DRAWER Drawer ================= */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/60 backdrop-blur-sm transition-all" onClick={() => setIsMobileSidebarOpen(false)}>
            <div className={`w-64 max-w-[80vw] h-full flex flex-col p-4 shadow-2xl relative ${isDarkMode ? "bg-slate-900 border-r border-slate-800" : "bg-white border-r border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
              
              {/* Drawer Close trigger */}
              <button className="absolute top-4 right-4 p-1 rounded-md" onClick={() => setIsMobileSidebarOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>

              {/* Logo */}
              <div className="h-12 flex items-center gap-3 mb-6 border-b pb-2">
                <div className="p-1 rounded bg-blue-600 text-white shadow shadow-blue-600/10">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm tracking-tight text-blue-600 font-display">Workflow ESM</span>
              </div>

              {/* Dynamic user indicators */}
              <div className="mb-4">
                <p className="text-xs font-bold">{currentUser.name}</p>
                <span className="text-[9px] font-mono text-slate-450 uppercase">{currentUser.role} &bull; {currentUser.campus}</span>
              </div>

              {/* Navigation list */}
              <nav className="flex-1 space-y-1 overflow-y-auto">
                {activeNavigationItems.map((item) => {
                  const IconComp = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveTab(item.key);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-all ${
                        isActive
                          ? "bg-blue-600 text-white shadow"
                          : isDarkMode
                            ? "text-slate-400 hover:text-white hover:bg-slate-800"
                            : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                      }`}
                    >
                      <IconComp className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-1 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 border-t border-slate-100 dark:border-slate-800 pt-3"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>

            </div>
          </div>
        )}

        {/* ================= CENTRAL WRAPPER PORTAL MAIN CONTENT ================= */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* ================= HEADER PANEL ================= */}
          <header className={`h-16 flex items-center justify-between px-6 border-b shrink-0 transition-colors duration-200 ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            
            {/* Left Header segment */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-850 md:hidden cursor-pointer"
                title="Open navigational links menu"
              >
                <Menu className="w-5 h-5 text-slate-500" />
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-extrabold tracking-tight capitalize">
                  {activeNavigationItems.find((n) => n.key === activeTab)?.label || "Workflow Dashboard"}
                </span>
                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentUser.role === "Super Admin" ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                }`}>
                  {currentUser.role}
                </span>
              </div>
            </div>

            {/* Right Header Controls panel indicators */}
            <div className="flex items-center space-x-4">
              
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</span>
                <span className="text-[10px] text-slate-450">{currentUser.campus} (PIN: {currentUser.pin})</span>
              </div>

              {/* Theme light toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full cursor-pointer border transition-colors ${
                  isDarkMode 
                    ? "bg-slate-950 border-slate-800 text-amber-400 hover:bg-slate-850" 
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
                title="Toggle visual theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={handleLogout}
                className="p-2 rounded-full cursor-pointer hover:bg-rose-500/10 text-rose-500"
                title="Logout current workspace session"
              >
                <LogOut className="w-4 h-4" />
              </button>

            </div>

          </header>

          {/* ================= DYNAMIC BODY VIEWS ================= */}
          <main className="flex-1 overflow-y-auto p-3 md:p-4">
            {renderTabContent()}
          </main>

        </div>

      </div>

    </div>
  );
}
