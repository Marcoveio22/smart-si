import { createFileRoute } from '@tanstack/react-router';

const NAYAX_BASE = 'https://vmpay.vertitecnologia.com.br/api/v1';

type Credencial = {
  id: string;
  loja_id: string;
  access_token: string;
  ultimo_id_processado: number | null;
};

async function sincronizar() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const admin = supabaseAdmin as unknown as {
    from: (t: string) => any;
  };

  const { data: credenciais, error } = await admin
    .from('loja_nayax_credentials')
    .select('id, loja_id, access_token, ultimo_id_processado')
    .eq('status', 'ativo');

  if (error) throw error;

  const resultados: unknown[] = [];

  for (const cred of (credenciais ?? []) as Credencial[]) {
    try {
      // 1. Monta a URL — incremental por transaction_id quando já houve sincronização,
      //    senão usa as últimas 24h como ponto de partida (start_date + end_date são
      //    obrigatórios na prática).
      const params = new URLSearchParams({
        access_token: cred.access_token,
        per_page: '1000',
      });
      if (cred.ultimo_id_processado) {
        params.set('transaction_id_greater_than', String(cred.ultimo_id_processado));
      } else {
        params.set('start_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        params.set('end_date', new Date().toISOString());
      }

      const resp = await fetch(`${NAYAX_BASE}/cashless_facts?${params.toString()}`);
      if (!resp.ok) throw new Error(`Nayax respondeu ${resp.status}`);
      const payload = await resp.json();
      const transacoesNayax: any[] = Array.isArray(payload) ? payload : (payload?.data ?? []);

      let maiorId = cred.ultimo_id_processado ?? 0;
      let clientesAtualizados = 0;

      for (const t of transacoesNayax) {
        if (Number(t.id) > maiorId) maiorId = Number(t.id);

        let clienteId: string | null = null;

        // 2. Somente transações com cartão geram/atualizam cliente.
        //    Sem masked_card_number (ex.: PIX) a transação é gravada sem vínculo.
        if (t.masked_card_number) {
          const { data: clienteExistente } = await admin
            .from('clientes')
            .select('id, total_compras, total_gasto')
            .eq('loja_id', cred.loja_id)
            .eq('numero_cartao', t.masked_card_number)
            .maybeSingle();

          if (clienteExistente) {
            const { error: updErr } = await admin
              .from('clientes')
              .update({
                total_compras: (clienteExistente.total_compras ?? 0) + 1,
                total_gasto: Number(clienteExistente.total_gasto ?? 0) + Number(t.value ?? 0),
                ultima_compra: t.occurred_at,
              })
              .eq('id', clienteExistente.id);
            if (updErr) throw updErr;
            clienteId = clienteExistente.id;
          } else {
            const { data: novoCliente, error: novoErr } = await admin
              .from('clientes')
              .insert({
                loja_id: cred.loja_id,
                numero_cartao: t.masked_card_number,
                total_compras: 1,
                total_gasto: Number(t.value ?? 0),
                ultima_compra: t.occurred_at,
              })
              .select('id')
              .single();
            if (novoErr) throw novoErr;
            clienteId = novoCliente.id;
          }
          clientesAtualizados++;
        }

        // 3. Upsert por nayax_transaction_id evita duplicidade em reprocessamento.
        const { error: transErr } = await admin.from('transacoes').upsert(
          {
            nayax_transaction_id: Number(t.id),
            loja_id: cred.loja_id,
            cliente_id: clienteId,
            numero_cartao: t.masked_card_number ?? null,
            valor: t.value ?? 0,
            data_transacao: t.occurred_at,
            status: t.status ?? null,
          },
          { onConflict: 'nayax_transaction_id' },
        );
        if (transErr) throw transErr;
      }

      // 4. Checkpoint de sincronização
      await admin
        .from('loja_nayax_credentials')
        .update({
          ultimo_id_processado: maiorId,
          ultima_sincronizacao: new Date().toISOString(),
          ultimo_erro: null,
        })
        .eq('id', cred.id);

      resultados.push({
        loja_id: cred.loja_id,
        ok: true,
        transacoes: transacoesNayax.length,
        clientes_atualizados: clientesAtualizados,
      });
    } catch (lojaErr: any) {
      await admin
        .from('loja_nayax_credentials')
        .update({ status: 'erro', ultimo_erro: String(lojaErr?.message ?? lojaErr) })
        .eq('id', cred.id);
      resultados.push({
        loja_id: cred.loja_id,
        ok: false,
        erro: String(lojaErr?.message ?? lojaErr),
      });
    }
  }

  return resultados;
}

function autorizado(request: Request) {
  const esperado = process.env['NAYAX_SYNC_SECRET'];
  if (!esperado) return false;
  const enviado =
    request.headers.get('x-sync-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    new URL(request.url).searchParams.get('secret');
  return enviado === esperado;
}

async function handler({ request }: { request: Request }) {
  if (!autorizado(request)) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const resultados = await sincronizar();
    return new Response(JSON.stringify({ resultados }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const Route = createFileRoute('/api/public/sync-nayax')({
  server: { handlers: { GET: handler, POST: handler } },
});
