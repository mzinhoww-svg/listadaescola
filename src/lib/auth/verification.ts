/**
 * Constantes e validação compartilhadas do fluxo de confirmação de e-mail.
 *
 * Vive fora de `actions.ts` de propósito: todo export de um módulo
 * `"use server"` precisa ser uma função async, então uma constante não pode
 * morar lá — e a tela (`/auth/verificar-email`), o formulário cliente e a
 * Server Action precisam enxergar exatamente os mesmos números. Texto de UI
 * que promete um limite diferente do que o servidor aplica é o tipo de
 * desalinhamento que este arquivo existe para impedir.
 *
 * Contexto operacional obrigatório antes de mexer aqui:
 * `docs/operations/smtp-setup.md`. Enquanto o SMTP próprio não estiver
 * configurado, nada neste fluxo garante entrega — o código abaixo cuida do
 * que é código (limite, cooldown, estado honesto na tela); entrega é
 * configuração.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string) {
  return EMAIL_RE.test(email);
}

/**
 * Janela mínima que o próprio GoTrue impõe entre dois envios para o mesmo
 * endereço. Verificado ao vivo contra o projeto real em 2026-09-13: um
 * `POST /auth/v1/resend` disparado ~9s depois do signup devolveu
 * `HTTP 429 {"error_code":"over_email_send_rate_limit","msg":"For security
 * purposes, you can only request this after 51 seconds."}`. O contador da UI
 * usa este valor para não deixar o usuário gastar um clique — e um pedido do
 * balde de `RESEND_MAX_ATTEMPTS` — num envio que o servidor recusaria.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Limite aplicado pelo projeto, por (e-mail + IP), em cima do cooldown do
 * GoTrue. Estes dois números NÃO são configuráveis no call site: são os
 * valores fixos dentro de `check_login_rate_limit`
 * (`supabase/migrations/20260911220000_gap_fixes_prompt20.sql`) — 5
 * ocorrências em 15 minutos. Mudá-los exige migration, não edição aqui;
 * estão duplicados como constante só para que o texto da tela nunca
 * divirja do limite real.
 */
export const RESEND_MAX_ATTEMPTS = 5;
export const RESEND_WINDOW_MINUTES = 15;

/**
 * Prefixo do identificador de rate limit do reenvio. Existe para o reenvio
 * não dividir o mesmo balde das tentativas de login do mesmo e-mail: o
 * identificador de login é `<email>:<ip>` e o de reenvio é
 * `reenvio-verificacao:<email>:<ip>`, então cinco reenvios não trancam o
 * login de ninguém (e vice-versa).
 */
export const RESEND_RATE_LIMIT_PREFIX = "reenvio-verificacao";
