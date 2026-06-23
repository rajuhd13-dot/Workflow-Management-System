import React, { useState } from "react";
import { User } from "../types";
import { Send, FileInput, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface EnterWorkflowProps {
  currentUser: User;
}

export default function EnterWorkflow({ currentUser }: EnterWorkflowProps) {
  const [date, setDate] = useState(() => {
    // Current Local ISO Date String (YYYY-MM-DD)
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  });
  const [workHistory, setWorkHistory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workHistory.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/workflow/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: currentUser.pin,
          date,
          workHistory: workHistory.trim(),
        }),
      });

      const body = await res.json();
      if (body.success) {
        setStatusMessage({
          type: "success",
          text: `Workflow successfully logged under column: ${body.activeMonth}!`,
        });
        setWorkHistory(""); // Clear input history on success!
      } else {
        setStatusMessage({
          type: "error",
          text: body.error || "Failed to submit workflow entry.",
        });
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: "Could not establish connection to the backend.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3.5">
      
      {/* Form interface */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Read Only Meta-Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Full Name
              </label>
              <input
                type="text"
                readOnly
                value={currentUser.name}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-slate-500 cursor-not-allowed outline-none focus:ring-0 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                PIN Code
              </label>
              <input
                type="text"
                readOnly
                value={`• • • ${currentUser.pin.slice(-2)}`}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-slate-500 cursor-not-allowed outline-none focus:ring-0 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Assigned Campus
              </label>
              <input
                type="text"
                readOnly
                value={currentUser.campus}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-slate-500 cursor-not-allowed outline-none focus:ring-0 text-xs"
              />
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/60" />

          {/* User Inputs fields */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 focus:blue-500">
                Log Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-xs font-medium w-full"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Work History & Accomplishments
              </label>
              <textarea
                required
                rows={4}
                value={workHistory}
                onChange={(e) => setWorkHistory(e.target.value)}
                placeholder="Detail the metrics, checks, audits, classes or general work performed today..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-600 transition-all text-xs font-normal"
              />
            </div>
          </div>

          {/* Feedback section */}
          {statusMessage && (
            <div className={`p-2.5 rounded-lg flex items-start space-x-2 text-xs ${statusMessage.type === "success" ? "bg-emerald-500/10 border border-emerald-500/10 text-emerald-500" : "bg-rose-500/10 border border-rose-500/10 text-rose-500"}`}>
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Buttons panel */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !workHistory.trim()}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-xs text-white transition-all cursor-pointer ${
                workHistory.trim() && !isSubmitting
                  ? "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/10"
                  : "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Entry...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Workflow</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
