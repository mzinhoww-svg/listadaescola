-- Onda 9 (confiança e prova social) -- procedência da lista.
--
-- Uma lista de material é conteúdo que a família vai gastar dinheiro em cima.
-- Quem publicou muda a confiança que ela merece, e o produto tem três origens
-- realmente distintas:
--
--   APPROVE_SUBMISSION            contribuição de terceiro, aprovada na fila
--                                 de moderação (approve_submission,
--                                 20260911150000_moderation_guards.sql:93)
--   ADMIN_PUBLISH_LIST            publicada direto pela equipe
--                                 (20260913010000_admin_publish_list.sql:130)
--   SCHOOL_MANAGER_PUBLISH_LIST   publicada pelo gestor verificado da própria
--                                 escola, sem fila de moderação -- Onda 7
--                                 (20260913040000_school_claim_and_publish.sql:443)
--
-- Até aqui a página pública da lista não mostrava nem quem publicou, nem
-- quando, nem qual versão -- `versionNumber`/`publishedAt` já vinham de
-- getListBySlug() e nenhuma tela usava.
--
-- POR QUE audit_logs, E NÃO UM JOIN AO VIVO
--
-- A alternativa óbvia era derivar no momento da leitura: `submission_id is
-- not null` => comunidade; senão, `exists (select 1 from school_managers
-- where profile_id = published_by and school_id = ...)` => escola; senão =>
-- equipe. Ela é errada de um jeito silencioso: `school_managers` é vínculo
-- ATUAL. Um gestor que publica a lista e depois perde o vínculo (claim
-- revogado, troca de direção) faria o rótulo de uma lista já publicada mudar
-- sozinho de "publicada pela escola" para "publicada pela equipe", sem que
-- nada tenha acontecido com a lista. O audit log é registro do que aconteceu
-- no ato da publicação e não se move depois.
--
-- O QUE ESTA FUNÇÃO NÃO FAZ
--
-- Não devolve `actor_id`, nome, e-mail nem qualquer identificador de pessoa
-- -- só um de três rótulos de um CASE fechado. `audit_logs` continua legível
-- apenas por admin (audit_logs_admin_read); esta função é SECURITY DEFINER
-- justamente para não precisar afrouxar aquela policy.
--
-- E só responde sobre versão que JÁ é pública (versão PUBLISHED + lista
-- APPROVED + escola ativa -- a mesma tripla de RN-006 que getListBySlug
-- exige). Sem isso a função viraria um oráculo: alguém poderia varrer uuids
-- e descobrir a existência de rascunhos e listas arquivadas.
--
-- Versão sem linha de auditoria (a fixture de QA entrou por SQL direto,
-- contornando as três funções) devolve NULL, e a UI não mostra rótulo
-- nenhum. Preferir o silêncio a um rótulo chutado é a mesma disciplina de
-- "nunca fabricar distância".

create or replace function public.list_version_provenance(p_version_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case a.action
           when 'APPROVE_SUBMISSION' then 'COMMUNITY'
           when 'ADMIN_PUBLISH_LIST' then 'TEAM'
           when 'SCHOOL_MANAGER_PUBLISH_LIST' then 'SCHOOL'
         end
  from public.audit_logs a
  where a.action in ('APPROVE_SUBMISSION', 'ADMIN_PUBLISH_LIST', 'SCHOOL_MANAGER_PUBLISH_LIST')
    and a.after ->> 'school_list_version_id' = p_version_id::text
    and exists (
      select 1
      from public.school_list_versions v
      join public.school_lists l on l.id = v.school_list_id
      join public.schools s on s.id = l.school_id
      where v.id = p_version_id
        and v.status = 'PUBLISHED'
        and l.status = 'APPROVED'
        and s.is_active
    )
  order by a.created_at desc
  limit 1;
$$;

comment on function public.list_version_provenance(uuid) is
  'Onda 9: procedência pública de uma versão de lista -- COMMUNITY (contribuição aprovada na moderação), TEAM (publicada pela equipe) ou SCHOOL (publicada pelo gestor da própria escola). Lê o audit log, que é registro do ato de publicação e não muda depois; nunca devolve identidade de pessoa. Só responde para versão já pública (PUBLISHED + lista APPROVED + escola ativa); qualquer outro caso devolve NULL.';

-- Sem isto, toda visita a uma página de lista faz seq scan em audit_logs,
-- que é a tabela que mais cresce do sistema. Parcial e por expressão: o
-- índice só cobre as três ações de publicação e a chave que a função usa.
create index if not exists audit_logs_list_version_idx
  on public.audit_logs ((after ->> 'school_list_version_id'))
  where action in ('APPROVE_SUBMISSION', 'ADMIN_PUBLISH_LIST', 'SCHOOL_MANAGER_PUBLISH_LIST');

-- A lição já cara deste projeto (20260911150100, 20260911160100): `revoke
-- ... from anon` é no-op, porque o grant real é a EXECUTE implícita para
-- PUBLIC na criação. Revoga de PUBLIC e concede explicitamente.
revoke execute on function public.list_version_provenance(uuid) from public;
grant execute on function public.list_version_provenance(uuid) to anon, authenticated;
