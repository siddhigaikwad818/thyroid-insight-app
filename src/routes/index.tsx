import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Sign in — ThyroCare" },
    { name: "description", content: "Sign in securely to access thyroid screening." },
    { property: "og:title", content: "Sign in — ThyroCare" },
    { property: "og:description", content: "Secure access to thyroid screening." },
  ] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/screening", replace: true });
    });
  }, [navigate]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    if (mode === "forgot") {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false); authError ? setError(authError.message) : setMessage("Check your email for a password reset link."); return;
    }
    if (mode === "signup") {
      const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (authError) setError(authError.message);
      else if (!data.session) setMessage("Check your email to confirm your account, then sign in.");
      else await navigate({ to: "/screening", replace: true });
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false); authError ? setError("Email or password is incorrect.") : await navigate({ to: "/screening", replace: true });
  }

  return <main className="flex min-h-screen items-center justify-center px-5 py-10"><section className="w-full max-w-md">
    <div className="mb-8 flex items-center justify-center gap-3"><span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Activity /></span><span className="font-display text-2xl font-semibold">ThyroCare</span></div>
    <div className="card-surface p-7 sm:p-8"><div className="text-center"><LockKeyhole className="mx-auto size-7 text-primary" /><h1 className="mt-3 text-2xl font-semibold">{mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1><p className="mt-2 text-sm text-muted-foreground">{mode === "forgot" ? "We’ll send a secure reset link to your email." : "Enter your details to continue to screening."}</p></div>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <label className="block"><span className="text-sm font-semibold">Email address</span><span className="relative mt-1.5 block"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-10" /></span></label>
        {mode !== "forgot" && <label className="block"><span className="text-sm font-semibold">Password</span><span className="relative mt-1.5 block"><Input type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-11" /><Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword((v) => !v)} className="absolute right-1 top-1 size-9" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</Button></span></label>}
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}{message && <p className="rounded-lg bg-teal/12 px-3 py-2 text-sm" role="status">{message}</p>}
        <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-2 text-sm">{mode === "signin" && <Button type="button" variant="link" onClick={() => setMode("forgot")}>Forgot password?</Button>}<Button type="button" variant="link" onClick={() => { setMode(mode === "signup" ? "signin" : mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>{mode === "signup" ? "Already have an account? Sign in" : mode === "forgot" ? "Back to sign in" : "New here? Create an account"}</Button></div>
    </div>
  </section></main>;
}