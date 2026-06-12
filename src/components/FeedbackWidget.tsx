import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const SCORES = [1, 2, 3, 4, 5];

/**
 * Floating in-app feedback capture — the validation loop for design
 * partners. Every submission lands in product_feedback with the page it
 * came from, feeding the per-workflow satisfaction summary.
 */
export default function FeedbackWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setOpen(false);
    setScore(null);
    setComment("");
  };

  const submit = async () => {
    if (score === null) return;
    setSubmitting(true);
    try {
      await api.submitFeedback({
        score,
        comment: comment.trim() || undefined,
        page: location.pathname,
      });
      toast.success("Thanks — your feedback shapes what we build next.");
      reset();
    } catch {
      toast.error("Could not send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Give feedback"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-slate-700"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">How is this page working for you?</p>
        <button onClick={reset} aria-label="Close feedback" className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex justify-between gap-1.5">
        {SCORES.map((s) => (
          <button
            key={s}
            onClick={() => setScore(s)}
            aria-label={`Score ${s}`}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
              score === s
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mb-3 flex justify-between text-[10px] uppercase tracking-wide text-slate-400">
        <span>Frustrating</span>
        <span>Excellent</span>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What should we improve? (optional)"
        rows={3}
        className="mb-3 w-full resize-none rounded-lg border border-slate-200 p-2.5 text-sm focus:border-blue-400 focus:outline-none"
      />

      <button
        onClick={submit}
        disabled={score === null || submitting}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}
