DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ocorrencia_status') THEN
    CREATE TYPE public.ocorrencia_status AS ENUM (
      'Nova',
      'Em análise',
      'Comunicado ao Síndico',
      'Comunicado ao RH',
      'Negociação',
      'Cobrança Enviada',
      'Pagamento Recebido',
      'Finalizada',
      'Arquivada'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ocorrencia_prioridade') THEN
    CREATE TYPE public.ocorrencia_prioridade AS ENUM ('Baixa','Média','Alta','Crítica');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ocorrencia_origem') THEN
    CREATE TYPE public.ocorrencia_origem AS ENUM ('Manual','Upload','Automática','Integração');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cobranca_status') THEN
    CREATE TYPE public.cobranca_status AS ENUM ('Pendente','Enviada','Negociada','Paga','Cancelada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recuperacao_forma') THEN
    CREATE TYPE public.recuperacao_forma AS ENUM ('PIX','Dinheiro','Cartão','Boleto','Desconto em folha','Outro');
  END IF;
END $$;