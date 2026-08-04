import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Users, Bell, FileWarning, Cpu, UploadCloud, Settings, ShieldCheck, LogOut,
  Store, UserCog, DollarSign, MessageCircle, FileText, History, GraduationCap, Lightbulb, Bot,
  ChevronDown, ChevronsUpDown,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { getDashboardStats } from "@/lib/dashboard.functions";

type Item = { title: string; url: string; icon: any };

const operacao: Item[] = [
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Ocorrências", url: "/ocorrencias", icon: FileWarning },
];
const operacaoFim: Item[] = [
  { title: "Processamentos", url: "/processamentos", icon: Cpu },
  { title: "Processamento Diário", url: "/uploads", icon: UploadCloud },
  { title: "Loja", url: "/configuracoes/loja", icon: Store },
];
const cobranca: Item[] = [
  { title: "Gerar Cobrança", url: "/cobrancas", icon: DollarSign },
  { title: "WhatsApp", url: "/cobrancas/whatsapp", icon: MessageCircle },
  { title: "PDF / Relatórios", url: "/cobrancas/pdf", icon: FileText },
  { title: "Histórico de Cobranças", url: "/cobrancas/historico", icon: History },
];
const inteligencia: Item[] = [{ title: "Alertas", url: "/alertas", icon: Bell }];
const treinamentos: Item[] = [
  { title: "Treinamentos", url: "/treinamentos", icon: GraduationCap },
  { title: "Dicas Operacionais", url: "/dicas", icon: Lightbulb },
  { title: "Suporte da IA", url: "/suporte-ia", icon: Bot },
];
const configuracoes: Item[] = [{ title: "Configurações", url: "/configuracoes", icon: Settings }];
const adminItems: Item[] = [{ title: "Usuários & Lojas", url: "/configuracoes/usuarios", icon: UserCog }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { tenant, selectedLojaId } = useTenant();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const fetchStats = useServerFn(getDashboardStats);
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", selectedLojaId ?? "own"],
    queryFn: () => fetchStats({ data: { lojaId: selectedLojaId } }),
    enabled: !!tenant,
    staleTime: 60_000,
  });
  const ocorrenciasBadge = Number(stats?.alertasAtivos ?? 0);

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");
  const cobrancaOpen = cobranca.some((c) => isActive(c.url));

  const nome = email ? email.split("@")[0] : "Usuário";
  const initials = nome.slice(0, 2).toUpperCase();
  const cargo = tenant?.isAdmin ? "Administrador" : "Gestor";

  const renderItems = (items: Item[], badges?: Record<string, number>) =>
    items.map((item) => {
      const badge = badges?.[item.url];
      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
            <Link to={item.url}>
              <item.icon className="h-4 w-4" />
              <span className="flex-1 truncate">{item.title}</span>
              {!collapsed && !!badge && (
                <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {badge}
                </span>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-base font-extrabold tracking-tight text-sidebar-foreground">SMART SI</span>
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/60">
                Monitoramento
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems([{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }])}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItems(operacao, { "/ocorrencias": ocorrenciasBadge })}

              <Collapsible defaultOpen={cobrancaOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Cobrança" isActive={cobrancaOpen}>
                      <DollarSign className="h-4 w-4" />
                      <span className="flex-1 truncate">Cobrança</span>
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {cobranca.map((c) => (
                        <SidebarMenuSubItem key={c.url}>
                          <SidebarMenuSubButton asChild isActive={pathname === c.url}>
                            <Link to={c.url}>
                              <span className="truncate">{c.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {renderItems(operacaoFim)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Inteligência</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(inteligencia)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Treinamentos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(treinamentos)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItems(tenant?.isAdmin ? [...configuracoes, ...adminItems] : configuracoes)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={nome}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold capitalize">{nome}</span>
                    <span className="truncate text-[11px] text-sidebar-foreground/60">{cargo}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes">
                    <Settings className="mr-2 h-4 w-4" /> Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/auth";
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
