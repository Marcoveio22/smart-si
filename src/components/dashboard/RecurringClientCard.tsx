import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type RecurringClient = {
  id: string;
  nome: string;
  ocorrencias: number | string;
  ultimaOcorrencia: string;
  horario: string;
  valorRecuperado?: string;
};

export function RecurringClientCard({
  client,
  onClick,
}: {
  client: RecurringClient;
  onClick?: () => void;
}) {
  const initials = client.nome.replace(/\D/g, "").slice(-2) || client.nome.slice(0, 2).toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 hover:bg-muted/60 disabled:cursor-default"
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium font-mono">{client.nome}</div>
        <div className="truncate text-[11px] text-muted-foreground">{client.ultimaOcorrencia}</div>
        {client.valorRecuperado && (
          <div className="truncate text-[11px] text-[var(--rating-trusted)]">Recuperado {client.valorRecuperado}</div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold">{client.ocorrencias}</div>
        <div className="text-[11px] text-muted-foreground">{client.horario}</div>
      </div>
    </button>
  );
}
