import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BUCKETS = ["ocorrencias", "thumbnails", "pdfs", "relatorios"] as const;

/** POST /storage/signed — URLs assinadas para imagens de ocorrências (RLS do usuário). */
export const getSignedUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        paths: z.array(z.string().min(1)).max(60),
        bucket: z.enum(BUCKETS).default("ocorrencias"),
        expiresIn: z.number().int().min(60).max(3600).default(1800),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!data.paths.length) return { urls: {} as Record<string, string> };
    const urls: Record<string, string> = {};
    const bucketOf = (p: string) => {
      const [head, ...rest] = p.split("/");
      return (BUCKETS as readonly string[]).includes(head)
        ? { bucket: head, path: rest.join("/") }
        : { bucket: data.bucket, path: p };
    };
    await Promise.all(
      data.paths.map(async (raw) => {
        const { bucket, path } = bucketOf(raw);
        const res = await context.supabase.storage.from(bucket).createSignedUrl(path, data.expiresIn);
        if (res.data?.signedUrl) urls[raw] = res.data.signedUrl;
      }),
    );
    return { urls };
  });
