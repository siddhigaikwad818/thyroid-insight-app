import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/screening", label: "Screening" },
  { to: "/result", label: "Result" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link to="/screening" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 12h3l2 5 3-10 2.5 7 1.5-4h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-semibold">ThyroCare</span>
              <span className="block text-[0.68rem] font-medium uppercase tracking-widest text-muted-foreground">Thyroid screening</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                activeProps={{ className: "rounded-lg px-3 py-2 bg-secondary text-secondary-foreground" }}
                activeOptions={{ exact: true }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-5 text-sm text-muted-foreground">Screening support only — not a diagnosis.</div>
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
      <p className="font-semibold">Screening result — not a medical diagnosis</p>
      <p className="mt-1 text-sm">
        A qualified doctor must interpret thyroid tests, symptoms, medicines, pregnancy status, and
        medical history before confirming a condition or treatment.
      </p>
    </div>
  );
}
