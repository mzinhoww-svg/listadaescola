# Listada Escola — RLS / Security Model

## Objetivo

RLS é a camada primária de isolamento no Supabase. O frontend nunca é considerado autoridade para permissões.

## Princípios

- Toda tabela pública tem RLS habilitado.
- Leitura pública é explicitamente limitada a registros ativos/publicados.
- Escrita do usuário é limitada ao próprio ownership.
- Ações administrativas usam `is_admin()`/`is_staff()` ou funções equivalentes e nunca dependem de esconder UI.
- Dados privados de submissão e anexos ficam inacessíveis a usuários não autorizados.
- Analytics e audit log não são gravados diretamente por clientes; usar server-side ou funções seguras.

## Matriz

| Tabela | Anon SELECT | Auth SELECT | Auth INSERT | Auth UPDATE | Admin |
|---|---|---|---|---|---|
| schools | ativos | ativos | não | não | full |
| school_profiles | ativos | ativos | manager | manager | full |
| school_contacts | ativos | ativos | manager | manager | full |
| school_images | aprovadas | aprovadas | manager | manager | full |
| school_managers | não | próprio | não | não | full |
| school_lists | aprovadas | aprovadas | manager | manager | full |
| school_list_versions | publicados | publicados | manager | manager | full |
| school_list_items | publicados | publicados | manager | manager | full |
| list_submissions | não | próprias | próprias | draft/correction | full |
| submission_items | não | próprios | próprios | próprios | full |
| submission_attachments | não | próprios | próprios | próprios | full |
| profiles | não | próprio | trigger | próprio | full |
| favorites | não | próprias | próprias | próprias | full |
| reviews | aprovadas | aprovadas/próprias | próprias | próprias | full/moderate |
| reports | não | próprias | próprias | não | full |
| campaigns | não | não | não | não | full |
| analytics_* | não | não | server | não | read |
| audit_logs | não | não | trigger | não | read |

## Testes de segurança obrigatórios

1. Usuário A não lê submission B.
2. Usuário A não altera submission B.
3. Usuário A não exclui submission B.
4. Usuário comum não altera role de profile.
5. Usuário comum não aprova lista.
6. Usuário comum não altera campanha.
7. Usuário comum não altera escola INEP.
8. Usuário comum não acessa attachment privado de outro usuário.
9. School Manager A não altera school B.
10. Store Manager A não altera store B.

## Secrets

- Browser: somente variáveis `NEXT_PUBLIC_*` que sejam realmente publicáveis.
- Server: Supabase secret/service key, geocoding secrets e outras credenciais privadas.
- Não usar defaults de segredo no repositório.

## XSS

Campos livres são tratados como texto. Quando rich text for necessário, sanitização deve ocorrer antes de persistência/renderização e os testes devem cobrir `script`, `javascript:` e atributos perigosos.
