import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — ThyroCare" }, { name: "description", content: "Set a new password for your ThyroCare account." }, { property: "og:title", content: "Set new password — ThyroCare" }, { property: "og:description", content: "Set a new password for your ThyroCare account." }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate(); const [password, setPassword] = useState(""); const [ready, setReady] = useState(false); const [error, setError] = useState("");
  useEffect(() => { const recovery = window.location.hash.includes("type=recovery"); void supabase.auth.getSession().then(({ data }) => setReady(recovery || Boolean(data.session))); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const { error: authError } = await supabase.auth.updateUser({ password }); if (authError) setError(authError.message); else await navigate({ to: "/screening", replace: true }); }
  return <main className="flex min-h-screen items-center justify-center px-5"><section className="card-surface w-full max-w-md p-8"><h1 className="text-2xl font-semibold">Set a new password</h1>{ready ? <form onSubmit={submit} className="mt-6 space-y-4"><Input type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="h-11" />{error && <p className="text-sm text-danger">{error}</p>}<Button className="h-11 w-full">Update password</Button></form> : <p className="mt-4 text-sm text-muted-foreground">Open the reset link from your email to continue.</p>}</section></main>;
}