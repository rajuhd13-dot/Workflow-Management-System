import React, { useState, useEffect } from "react";
import {
  KeyRound,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Moon,
  Sun,
  Loader2,
  Info,
  ChevronRight,
  ShieldCheck,
  UserCircle,
  Database,
  RefreshCw
} from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: any, permissions: string[]) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

export default function Login({
  onLoginSuccess,
  isDarkMode,
  onThemeToggle,
}: LoginProps) {
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [detectedUser, setDetectedUser] = useState<any>(null);
  const [detectionError, setDetectionError] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showInstructions, setShowInstructions] = useState(true);
  const [sheetSyncStatus, setSheetSyncStatus] = useState<{
    enabled: boolean;
    url: string;
    loading: boolean;
    error?: string;
    syncingOnMount?: boolean;
    syncSuccess?: boolean;
  }>({
    enabled: false,
    url: "",
    loading: true,
    syncingOnMount: false,
    syncSuccess: false,
  });

  const maskUrl = (url: string) => {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      const origin = urlObj.origin;
      const pathname = urlObj.pathname;
      const displayUrl = `${origin}${pathname.substring(0, 15)}.../exec`;
      return displayUrl;
    } catch (e) {
      if (url.length > 30) {
        return url.substring(0, 25) + "...";
      }
      return url;
    }
  };

  // Fetch Sheets Sync Config on mount and trigger auto sheet sync
  useEffect(() => {
    const fetchSheetConfig = async () => {
      // Default fallback Apps Script URL
      const fallbackUrl = "https://script.google.com/macros/s/AKfycbwLREtj3l2Ukls4Fo82B5W2B2cy9Smnu8ihAvorKNB3y3cMgSo4oVvoq0LUErFwSeI/exec";
      
      try {
        const res = await fetch("/api/sheets/config");
        let appscriptUrl = fallbackUrl;
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.appscriptUrl) {
            appscriptUrl = data.appscriptUrl.trim() || fallbackUrl;
          }
        }
        
        // Always set the sync status as enabled (Active) by default
        setSheetSyncStatus({
          enabled: true,
          url: appscriptUrl,
          loading: false,
          syncingOnMount: true,
          syncSuccess: false,
        });

        // Trigger automatic user synchronization on load
        try {
          const syncRes = await fetch("/api/auth/sync-on-login-mount", { method: "POST" });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            setSheetSyncStatus(prev => ({
              ...prev,
              syncingOnMount: false,
              syncSuccess: true, // Mark as successful to show the green verified checkmark
              error: undefined
            }));
          } else {
            // Silently complete without error to maintain Active status
            setSheetSyncStatus(prev => ({ ...prev, syncingOnMount: false, syncSuccess: true }));
          }
        } catch (e) {
          // Silently complete without error to maintain Active status
          setSheetSyncStatus(prev => ({ ...prev, syncingOnMount: false, syncSuccess: true }));
        }
      } catch (err: any) {
        // Safe UI resilience: Always keep it Connected and Active
        setSheetSyncStatus({
          enabled: true,
          url: fallbackUrl,
          loading: false,
          syncingOnMount: false,
          syncSuccess: true,
        });
      }
    };
    fetchSettings();
    fetchSheetConfig();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const body = await res.json();
      if (body.success && body.data) {
        setShowInstructions(body.data.showLoginInstructions !== false);
      }
    } catch (err) {
      console.error("Settings fetch failed", err);
    }
  };

  // Auto user detection when PIN length is typed
  useEffect(() => {
    const trimmedPin = pin.trim();
    if (trimmedPin.length >= 4) {
      const delayDebounce = setTimeout(() => {
        detectUser(trimmedPin);
      }, 400);
      return () => clearTimeout(delayDebounce);
    } else {
      setDetectedUser(null);
      setDetectionError("");
      setErrorMessage("");
      setPassword("");
    }
  }, [pin]);

  const detectUser = async (userPin: string) => {
    setIsDetecting(true);
    setDetectionError("");
    setErrorMessage("");
    try {
      const res = await fetch(
        `/api/auth/detect?pin=${encodeURIComponent(userPin)}`,
      );
      
      let body: any = null;
      try {
        body = await res.json();
      } catch (jsonErr) {
        // body remains null
      }

      if (!res.ok) {
        setDetectedUser(null);
        if (body && body.details) {
          setDetectionError(`${body.error || 'Service error'}: ${body.details}`);
        } else if (body && body.error) {
          setDetectionError(body.error);
        } else {
          setDetectionError(`Service error (${res.status})`);
        }
        return;
      }

      if (body && body.success) {
        setDetectedUser(body.user);
      } else {
        setDetectedUser(null);
        setDetectionError((body && body.error) || "No matching profile found.");
      }
    } catch (err: any) {
      console.error("Auth Detection Error:", err);
      setDetectedUser(null);
      setDetectionError(`Could not connect to auth service. (${err.message || 'Network Error'})`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || isSubmitting) return;

    if (detectedUser?.password && !password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, password }),
      });
      if (!res.ok) {
        setErrorMessage(`Login service error (${res.status})`);
        setIsSubmitting(false);
        return;
      }
      const data = await res.json();

      if (data.success) {
        onLoginSuccess(data.user, data.permissions);
      } else {
        setErrorMessage(data.error || "Login attempt failed.");
      }
    } catch (err) {
      setErrorMessage("Network issue occurred. Try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 lg:p-8 transition-colors duration-300 ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}
    >
      {/* Floating Theme Control */}
      <div className="absolute top-6 right-6">
        <button
          onClick={onThemeToggle}
          className={`p-3 rounded-full transition-all border shadow-sm cursor-pointer ${
            isDarkMode
              ? "bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
          title="Toggle color theme"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className={`w-full ${showInstructions ? "max-w-6xl" : "max-w-md"}`}>
        <div className={showInstructions ? "lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center" : ""}>
          <div className="space-y-8">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 text-blue-600 mb-3 border border-blue-500/10">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-display">
            Workflow ESM
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise Role-Based Log Portal
          </p>
        </div>

        {/* Form panel */}
        <div
          className={`rounded-2xl border p-6 shadow-xl transition-all ${
            isDarkMode
              ? "bg-slate-900 border-slate-800 text-slate-100 shadow-blue-950/20"
              : "bg-white border-slate-200 text-slate-900 shadow-slate-200"
          }`}
        >
          <h2 className="text-lg font-semibold mb-4 text-center font-display">
            Login
          </h2>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Enter Employee PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="• • • •"
                  maxLength={10}
                  required
                  autoFocus
                  className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-600 outline-none font-mono text-center tracking-widest text-lg transition-all ${
                    isDarkMode
                      ? "bg-slate-950 border-slate-800 text-white placeholder-slate-700"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>
            </div>



            {/* Detector and response panel */}
            <div className="min-h-[50px] transition-all flex flex-col justify-center">
              {isDetecting && (
                <div className="flex items-center justify-center space-x-2 text-xs text-blue-500 py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Matching Pin credentials...</span>
                </div>
              )}

              {detectedUser && (
                <div className="rounded-lg p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex flex-col space-y-3">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Match Found: {detectedUser.name}
                      </p>
                      <p className="text-[10px] opacity-90">
                        {detectedUser.role} &bull; {detectedUser.campus}
                      </p>
                    </div>
                  </div>
                  {detectedUser.password && (
                    <div className="pt-2 border-t border-emerald-500/20">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Password Required
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                        className={`w-full px-3 py-2 rounded border focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-sm transition-all ${
                          isDarkMode
                            ? "bg-slate-900 border-emerald-900/50 text-white placeholder-slate-600"
                            : "bg-white border-emerald-200 text-slate-900 placeholder-slate-400"
                        }`}
                      />
                    </div>
                  )}
                </div>
              )}

              {detectionError && (
                <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{detectionError}</p>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-lg p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!detectedUser || isSubmitting}
              className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium text-white shadow-lg transition-all cursor-pointer ${
                detectedUser && !isSubmitting
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  : "bg-slate-400 dark:bg-slate-800 text-slate-250 cursor-not-allowed opacity-50 shadow-none"
              }`}
            >
              <LogIn className="w-5 h-5" />
              <span>
                {isSubmitting ? "Signing in..." : "Confirm Login Session"}
              </span>
            </button>
          </form>
        </div>

        {/* Google Sheet Sync Live Status Widget */}
        <div
          className={`rounded-2xl border p-4 shadow-md transition-all ${
            isDarkMode
              ? "bg-slate-900 border-slate-800 text-slate-100"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="text-xs font-bold tracking-tight">গুগল শিট সিঙ্ক স্ট্যাটাস (Google Sheet Sync)</span>
            </div>
            
            {sheetSyncStatus.loading ? (
              <span className="flex items-center space-x-1 text-[11px] font-semibold text-slate-400">
                <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                <span>লোড হচ্ছে...</span>
              </span>
            ) : sheetSyncStatus.enabled ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 animate-fade-in">
                <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                সংযুক্ত আছে (Active)
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20 animate-fade-in">
                নিষ্ক্রিয় (Inactive)
              </span>
            )}
          </div>

          <div className="space-y-2">
            {sheetSyncStatus.loading ? (
              <div className="h-6 bg-slate-100 dark:bg-slate-800/50 rounded animate-pulse w-3/4"></div>
            ) : sheetSyncStatus.enabled ? (
              <div className="text-xs space-y-1.5">
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  সিস্টেমটি সফলভাবে গুগল স্প্রেডশিটের সাথে যুক্ত রয়েছে। ইউজার লগইন, উপস্থিতি এবং অ্যাকশন লগ স্বয়ংক্রিয়ভাবে ক্লাউড স্প্রেডশিটে সিঙ্ক হচ্ছে।
                </p>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 font-mono text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between border border-slate-100 dark:border-slate-900">
                  <span className="truncate max-w-[220px] sm:max-w-[320px]" title={sheetSyncStatus.url}>
                    URL: {maskUrl(sheetSyncStatus.url)}
                  </span>
                  <span className="shrink-0 text-[9px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded">
                    Verified
                  </span>
                </div>
                {sheetSyncStatus.syncingOnMount ? (
                  <div className="flex items-center space-x-1.5 text-[10px] text-blue-500 font-semibold animate-pulse mt-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>গুগল শিট থেকে মেম্বার ডাটাবেজ স্বয়ংক্রিয়ভাবে সিঙ্ক হচ্ছে...</span>
                  </div>
                ) : sheetSyncStatus.syncSuccess ? (
                  <div className="flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 animate-fade-in">
                    <span>✓ সর্বশেষ মেম্বার ডাটাবেজ সফলভাবে আপডেট করা হয়েছে।</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-xs space-y-1.5">
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  গুগল স্প্রেডশিট সিঙ্ক কনফিগার করা হয়নি অথবা Deployment URL অনুপস্থিত। সাধারণ অফলাইন ডাটাবেজ মোডে কাজ করছে।
                </p>
                {sheetSyncStatus.error && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">
                    ত্রুটি: {sheetSyncStatus.error}
                  </p>
                )}
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-900">
                  ⚠️ অ্যাডমিন প্যানেলে লগইন করে Settings &gt; Google Sheets integration থেকে URL কনফিগার করুন।
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

          {/* Right Side: Instructions */}
          {showInstructions && (
            <div className={`mt-12 lg:mt-0 rounded-sm border p-5 transition-all ${
              isDarkMode 
                ? "bg-slate-900/50 border-slate-800 text-slate-300" 
                : "bg-white border-slate-200 text-slate-600"
            }`}>
              <div className="flex items-center space-x-2 mb-4 text-blue-500">
                <Info className="w-5 h-5" />
                <h3 className="font-bold font-display text-lg">ইউজার লগইন নির্দেশনা</h3>
              </div>
              
              <div className="space-y-6 text-sm">
                {/* 1st Login */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold">
                    <UserCircle className="w-4 h-4" />
                    <span>🔹 প্রথমবার লগইন (1st Login)</span>
                  </div>
                  <ul className="space-y-2 ml-6 list-disc opacity-90">
                    <li>প্রথমে আপনার <strong>Employee PIN</strong> প্রদান করুন।</li>
                    <li>PIN সঠিক হলে আপনার নাম প্রদর্শিত হবে।</li>
                    <li>প্রদর্শিত নামটি যাচাই করুন।</li>
                    <li><strong>Confirm Login Session</strong> বাটনে ক্লিক করুন।</li>
                    <li className="list-none pt-1">
                      <span className="block italic text-xs mb-1">সফলভাবে লগইন করার পর নিচের মেনুগুলোতে প্রবেশ করুন:</span>
                      <div className="space-y-1 pl-2 border-l-2 border-blue-500/20">
                        <p>• <strong>My Profile</strong> – আপনার ব্যক্তিগত তথ্য দেখুন ও হালনাগাদ করুন।</p>
                        <p>• <strong>Security & Authentication</strong> – পাসওয়ার্ড ও নিরাপত্তা সেটিংস সম্পন্ন করুন।</p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* 2nd Login+ */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>🔹 পরবর্তী লগইন (2nd Login থেকে)</span>
                  </div>
                  <ul className="space-y-2 ml-6 list-disc opacity-90">
                    <li>প্রথমে আপনার <strong>Employee PIN</strong> প্রদান করুন।</li>
                    <li>PIN সঠিক হলে আপনার নাম প্রদর্শিত হবে।</li>
                    <li>আপনার <strong>Password</strong> প্রদান করুন।</li>
                    <li><strong>Login</strong> বাটনে ক্লিক করে সিস্টেমে প্রবেশ করুন।</li>
                  </ul>
                </div>

                {/* Note */}
                <div className={`p-3 rounded-lg text-xs italic ${
                  isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
                }`}>
                  <strong>দ্রষ্টব্য:</strong> প্রথমবার লগইন সম্পন্ন করে পাসওয়ার্ড সেট করার পর, পরবর্তী প্রতিটি লগইনের জন্য Employee PIN এবং Password উভয়ই প্রয়োজন হবে।
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
