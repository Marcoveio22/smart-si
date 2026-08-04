import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Trilha horizontal com setas de navegação e snap — usada em Ocorrências Recentes. */
export function HorizontalScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Anterior"
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 rounded-full bg-card shadow-sm sm:grid"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Próximo"
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 rounded-full bg-card shadow-sm sm:grid"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
