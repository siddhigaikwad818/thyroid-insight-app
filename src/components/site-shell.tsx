import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/screening", label: "Screening" },
  { to: "/result", label: "Result" },
  { to: "/insights", label: "Model insights" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 12h3l2 5 3-10 2.5 7 1.5-4h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-semibold">ThyroCare AI</span>
              <span className="block text-[0.68rem] font-medium uppercase tracking-widest text-muted-foreground">
                Thyroid screening study
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                activeProps={{ className: "rounded-lg px-3 py-2 bg-secondary text-secondary-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">
            ThyroCare AI — Artificial Intelligence in Healthcare college project
          </p>
          <p className="mt-1">
            Educational screening demo built on the public UCI Thyroid Disease dataset. Not a medical
            device and not a diagnosis.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-warn/50 bg-warn/15 text-warn-foreground ${
        compact ? "px-4 py-3 text-sm" : "px-5 py-4"
      }`}
    >
      <p className="font-semibold">Educational screening tool — not a medical diagnosis</p>
      <p className="mt-1 text-sm">
        ThyroCare AI shows statistical patterns learned from historical patient records. It cannot
        diagnose any condition. Always consult a qualified doctor for interpretation of your thyroid
        tests and for any medical decision.
      </p>
    </div>
  );
}
