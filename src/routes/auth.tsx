import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const dest = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        if (dest) window.location.href = dest;
        else navigate({ to: "/dashboard", replace: true });
      }
    });
  }, [navigate, dest]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const emailRedirectTo = dest ? `${window.location.origin}${dest}` : `${window.location.origin}/dashboard`;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode acessar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (dest) window.location.href = dest;
        else navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const redirect_uri = dest
      ? `${window.location.origin}/auth?next=${encodeURIComponent(dest)}`
      : window.location.origin;
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri });
    if (r.error) toast.error("Falha no login com Google");
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-background p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">SMART SI Monitoramento</h1>
          <p className="text-sm text-muted-foreground">Plataforma de inteligência operacional</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={google}>
          Continuar com Google
        </Button>

        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground">
          {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </Card>
    </div>
  );
}
