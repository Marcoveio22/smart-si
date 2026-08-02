import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSignedUrls } from "@/lib/api/storage.functions";
import { ImageIcon } from "lucide-react";
import { OccurrenceStatusBadge } from "./OccurrenceStatusBadge";

export type RecentOccurrence = {
  id: string;
  descricao: string;
  status: string;
  loja: string;
  horario: string;
  produto?: string | null;
  valor?: string;
  thumbPath?: string | null;
};

export function RecentOccurrenceCard({ item, onClick }: { item: RecentOccurrence; onClick?: () => void }) {
  const signUrls = useServerFn(getSignedUrls);
  const { data } = useQuery({
    queryKey: ["storage", "signed", [item.thumbPath]],
    queryFn: () => signUrls({ data: { paths: [item.thumbPath!] } }),
    enabled: !!item.thumbPath,
    staleTime: 10 * 60_000,
  });
  const thumb = item.thumbPath ? data?.urls?.[item.thumbPath] : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-left transition-all duration-200 hover:shadow-sm hover:border-border disabled:cursor-default"
    >
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground">
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <OccurrenceStatusBadge status={item.status} />
          <span className="text-[11px] text-muted-foreground shrink-0">{item.horario}</span>
        </div>
        <div className="truncate text-sm font-medium">{item.descricao}</div>
        {item.produto && <div className="truncate text-[11px] text-muted-foreground">{item.produto}</div>}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span className="truncate text-[11px] text-muted-foreground">{item.loja}</span>
          {item.valor && <span className="shrink-0 text-[11px] font-semibold">{item.valor}</span>}
        </div>
      </div>
    </button>
  );
}
