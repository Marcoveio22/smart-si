import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
  items = [],
}: {
  title: string;
  description: string;
  icon: any;
  items?: string[];
}) {
  return (
    <div className="space-y-6">
      <header className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
          <p className="truncate text-sm text-muted-foreground">{description}</p>
        </div>
      </header>

      <Card className="border-dashed border-border/70">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Este módulo está reservado no layout e será implementado em uma próxima sprint.
          </p>
          {!!items.length && (
            <ul className="mx-auto mt-4 grid max-w-md gap-2 text-left text-sm">
              {items.map((i) => (
                <li key={i} className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                  {i}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
