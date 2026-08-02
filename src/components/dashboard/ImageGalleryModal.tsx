import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSignedUrls } from "@/lib/api/storage.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Download, ImageOff, Loader2, ZoomIn, ZoomOut } from "lucide-react";

export type GalleryImage = { id: string; storage_path: string; thumbnail?: string | null; tipo?: string | null };

export function ImageGalleryModal({
  open,
  onOpenChange,
  images,
  title = "Imagens da ocorrência",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  images: GalleryImage[];
  title?: string;
}) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const signUrls = useServerFn(getSignedUrls);

  const paths = useMemo(
    () => [...new Set(images.flatMap((i) => [i.storage_path, i.thumbnail].filter(Boolean) as string[]))].slice(0, 60),
    [images],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["storage", "signed", paths],
    queryFn: () => signUrls({ data: { paths } }),
    enabled: open && paths.length > 0,
    staleTime: 10 * 60_000,
  });

  const urls = data?.urls ?? {};
  const current = images[index];
  const currentUrl = current ? urls[current.storage_path] : undefined;

  useEffect(() => {
    if (open) {
      setIndex(0);
      setZoom(1);
    }
  }, [open]);

  useEffect(() => setZoom(1), [index]);

  const go = (delta: number) => {
    if (!images.length) return;
    setIndex((i) => (i + delta + images.length) % images.length);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  const download = async () => {
    if (!currentUrl) return;
    const a = document.createElement("a");
    a.href = currentUrl;
    a.download = current?.storage_path.split("/").pop() ?? "imagem.jpg";
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {title}
            {images.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {index + 1} de {images.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {!images.length ? (
          <div className="grid place-items-center gap-2 py-14 text-sm text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            Nenhuma imagem registrada nesta ocorrência
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative grid h-[46vh] min-h-[240px] place-items-center overflow-auto rounded-lg border border-border/60 bg-muted/40">
              {isLoading && <Skeleton className="h-full w-full" />}
              {isError && <span className="text-sm text-destructive">Erro ao carregar a imagem</span>}
              {!isLoading && !isError && currentUrl && (
                <img
                  src={currentUrl}
                  alt={current?.tipo ?? "Imagem da ocorrência"}
                  loading="lazy"
                  className="max-h-full origin-center object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoom})` }}
                />
              )}
              {!isLoading && !isError && !currentUrl && (
                <span className="text-sm text-muted-foreground">Imagem indisponível</span>
              )}

              {images.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label="Imagem anterior"
                    className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2"
                    onClick={() => go(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label="Próxima imagem"
                    className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2"
                    onClick={() => go(1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <Button size="sm" variant="outline" className="gap-2" onClick={download} disabled={!currentUrl}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Baixar
              </Button>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => {
                  const thumb = urls[img.thumbnail ?? ""] ?? urls[img.storage_path];
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Miniatura ${i + 1}`}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border transition-all ${
                        i === index ? "border-primary ring-2 ring-primary/30" : "border-border/60 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
