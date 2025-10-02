import { Phone, PhoneOff, Video } from "lucide-react";

function ActionButton({ icon: Icon, label, tone, onClick }) {
  const baseClasses =
    "group inline-flex min-w-[9rem] items-center justify-center gap-3 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  const toneClasses =
    tone === "positive"
      ? "bg-emerald-500 text-white shadow-[0_18px_45px_-18px_rgba(16,185,129,0.65)] hover:bg-emerald-400"
      : "bg-red-500 text-white shadow-[0_18px_45px_-18px_rgba(239,68,68,0.65)] hover:bg-red-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${toneClasses}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function IncomingCallModal({
  caller,
  subtitle,
  onAccept,
  onReject,
  className = "",
}) {
  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm text-white ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label="Incoming call"
    >
      {/* Optional overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-xl px-6">
        <div className="flex flex-col items-center gap-8 rounded-[2.5rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl px-10 pb-12 pt-14 text-center shadow-[0_45px_120px_-60px_rgba(4,7,22,0.95)]">
          {/* Avatar / Caller initials */}
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/80 via-blue-600/80 to-blue-700/60 text-4xl font-semibold text-white shadow-xl">
            <span className="absolute -top-4 right-0 h-11 w-11 rounded-full bg-slate-900/50 backdrop-blur-xl">
              <span className="absolute inset-0 animate-pulse rounded-full bg-emerald-400/50" />
              <span className="relative m-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-slate-900">
                <Video className="h-4 w-4" />
              </span>
            </span>
            {caller.slice(0, 2).toUpperCase()}
          </div>

          {/* Call info */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">
              Incoming call
            </p>
            <h2 className="text-4xl font-semibold text-white">{caller}</h2>
            <p className="text-sm text-white/70">
              {subtitle || "is inviting you to join a video call session."}
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-white/60">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />{" "}
              Live video
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <ActionButton
              icon={Phone}
              label="Join call"
              tone="positive"
              onClick={onAccept}
            />
            <ActionButton
              icon={PhoneOff}
              label="Decline"
              tone="danger"
              onClick={onReject}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
