import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, BarChart3, BellRing, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import cameraImg from "@/assets/auth-camera.jpg";
import illustration from "@/assets/auth-illustration.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Smart SI Monitoramento" },
      { name: "description", content: "Acesse o Smart SI Monitoramento: prevenção de perdas, alertas em tempo real e relatórios inteligentes." },
      { property: "og:title", content: "Entrar — Smart SI Monitoramento" },
      { property: "og:description", content: "Tecnologia que monitora. Inteligência que protege." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Monitoramento Inteligente",
    desc: "Análise em tempo real com IA para identificar riscos e comportamentos suspeitos.",
  },
  {
    icon: BarChart3,
    title: "Relatórios Precisos",
    desc: "Dashboards completos e insights que ajudam na tomada de decisão.",
  },
  {
    icon: BellRing,
    title: "Alertas em Tempo Real",
    desc: "Notificações instantâneas para você agir antes que o problema aconteça.",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const dest = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
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

  const forgot = async () => {
    if (!email) return toast.error("Informe seu e-mail para recuperar a senha.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos as instruções para o seu e-mail.");
  };

  return (
    <div className="min-h-screen bg-sidebar px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Painel institucional */}
          <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
            <img
              src={cameraImg}
              alt="Câmera de segurança monitorando uma cidade à noite"
              width={900}
              height={1200}
              loading="lazy"
              className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[60%] w-full object-cover opacity-60"
            />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-sidebar via-sidebar/90 to-sidebar/40" />

            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="leading-tight">
                  <p className="text-3xl font-extrabold tracking-tight text-sidebar-foreground">
                    Smart <span className="text-primary">SI</span>
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sidebar-foreground/60">
                    Monitoramento Inteligente
                  </p>
                </div>
              </div>

              <div>
                <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-sidebar-foreground">
                  Tecnologia que monitora.
                  <br />
                  <span className="text-primary">Inteligência que protege.</span>
                </h1>
                <p className="mt-4 max-w-sm text-sm text-sidebar-foreground/70">
                  Soluções inteligentes para prevenção de perdas e segurança do seu negócio.
                </p>
              </div>

              <ul className="space-y-3">
                {FEATURES.map((f) => (
                  <li
                    key={f.title}
                    className="flex gap-3 rounded-xl border border-primary/25 bg-primary/10 p-4 backdrop-blur-sm"
                  >
                    <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-bold text-sidebar-foreground">{f.title}</p>
                      <p className="mt-0.5 text-xs text-sidebar-foreground/70">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 flex items-center gap-2 rounded-xl border border-primary/25 bg-sidebar/70 px-4 py-3 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-xs text-sidebar-foreground/80">
                Mais segurança. Menos perdas. <span className="font-semibold text-primary">Mais resultados.</span>
              </p>
            </div>
          </aside>

          {/* Formulário */}
          <main className="bg-card p-8 sm:p-12">
            <img
              src={illustration}
              alt="Ilustração de painel de monitoramento com câmeras e relatórios"
              width={800}
              height={600}
              className="mx-auto mb-6 h-40 w-auto object-contain"
            />

            <h2 className="text-3xl font-extrabold tracking-tight">
              {mode === "signin" ? "Bem-vindo de volta!" : "Crie sua conta"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Acesse sua conta para continuar acompanhando tudo em tempo real."
                : "Cadastre-se para começar a monitorar sua operação."}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="h-12 pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "signin" && (
                <div className="text-right">
                  <button type="button" onClick={forgot} className="text-sm font-medium text-primary hover:underline">
                    Esqueceu sua senha?
                  </button>
                </div>
              )}

              <Button type="submit" disabled={loading} className="h-12 w-full gap-2 text-base font-semibold">
                <ShieldCheck className="h-5 w-5" />
                {loading ? "Aguarde..." : mode === "signin" ? "Entrar no sistema" : "Criar conta"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" className="h-12 w-full gap-3 text-sm font-medium" onClick={google}>
              <GoogleIcon />
              Entrar com Google
            </Button>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Ainda não tem uma conta?" : "Já tem uma conta?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-primary hover:underline"
              >
                {mode === "signin" ? "Cadastre-se" : "Entrar"}
              </button>
            </p>
          </main>
        </div>
      </div>

      <footer className="mx-auto mt-8 max-w-6xl space-y-1 text-center text-xs text-sidebar-foreground/60">
        <p className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Protegemos o que <span className="font-semibold text-primary">importa</span> para o seu negócio.
        </p>
        <p>© {new Date().getFullYear()} Smart SI. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.7-10.3 6.7-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 019.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.9l-7.6-5.9c-2 1.4-4.8 2.4-8.2 2.4-6.4 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
