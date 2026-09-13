import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, MailCheck } from "lucide-react";

import { buildTeamWhatsappLink } from "@/lib/contact";
import {
  isValidEmail,
  RESEND_COOLDOWN_SECONDS,
  RESEND_MAX_ATTEMPTS,
  RESEND_WINDOW_MINUTES,
} from "@/lib/auth/verification";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Verifique seu e-mail" };

const SUPPORT_HREF = buildTeamWhatsappLink(
  "Olá! Criei uma conta na Listada Escola e o e-mail de confirmação não chegou. Meu e-mail de cadastro é: "
);

/**
 * Estados honestos de "não recebi o e-mail".
 *
 * O texto desta tela nunca afirma que o e-mail foi entregue — só que o envio
 * foi pedido. A razão está em `docs/operations/smtp-setup.md`: enquanto o
 * projeto usar o SMTP embutido do Supabase, a entrega para endereços fora do
 * time é recusada e `POST /auth/v1/signup` mesmo assim devolve HTTP 200 com
 * `confirmation_sent_at` preenchido. Não existe sinal de falha para o código
 * tratar — o que dá para fazer, e é o que esta tela faz, é não deixar o
 * usuário preso: explicar onde procurar, oferecer reenvio, dizer quanto
 * esperar e dar uma saída humana quando nada disso resolver.
 */
export default async function VerificarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email: rawEmail, next } = await searchParams;
  // Só ecoa o parâmetro se ele realmente parecer um e-mail: a query string é
  // conteúdo controlado por quem monta o link, e um /auth/verificar-email?
  // email=<texto qualquer> viraria um jeito barato de exibir texto arbitrário
  // dentro de uma tela oficial de autenticação.
  const email = rawEmail?.trim() && isValidEmail(rawEmail.trim()) ? rawEmail.trim() : undefined;

  return (
    <Card>
      <CardHeader>
        <MailCheck className="size-8 text-primary-600" aria-hidden="true" />
        <CardTitle as="h1">Verifique seu e-mail</CardTitle>
        <CardDescription>
          {email ? (
            <>
              Pedimos o envio de um link de confirmação para{" "}
              <strong className="font-medium text-neutral-900">{email}</strong>. Clique nele para
              ativar sua conta.
            </>
          ) : (
            "Pedimos o envio de um link de confirmação para o e-mail informado. Clique nele para ativar sua conta."
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">Não chegou ainda?</h2>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-neutral-700 marker:text-neutral-500">
            <li>Aguarde alguns minutos. O envio não é instantâneo.</li>
            <li>
              Procure na caixa de spam, no lixo eletrônico e na aba
              <span className="whitespace-nowrap"> “Promoções”</span>.
            </li>
            <li>
              Confira se o endereço acima está correto. Se você digitou errado no cadastro, a conta
              ficou presa no endereço errado — nesse caso,{" "}
              <Link
                href="/auth/criar-conta"
                className="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-800"
              >
                crie a conta de novo
              </Link>{" "}
              com o e-mail certo.
            </li>
            <li>
              Se for um e-mail corporativo, o filtro da empresa pode barrar a mensagem ou abrir o
              link antes de você (o que invalida o link de uso único). Vale tentar com um endereço
              pessoal.
            </li>
          </ol>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">Reenviar a confirmação</h2>
          <ResendVerificationForm defaultEmail={email} next={next} />
          <p className="text-sm text-neutral-600">
            Um novo envio a cada {RESEND_COOLDOWN_SECONDS} segundos, até {RESEND_MAX_ATTEMPTS}{" "}
            pedidos a cada {RESEND_WINDOW_MINUTES} minutos.
          </p>
        </section>

        <section className="flex flex-col gap-2 rounded-lg bg-warning-50 p-3">
          <h2 className="flex items-start gap-2 text-sm font-semibold text-warning-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Se mesmo assim não chegar
          </h2>
          <p className="text-sm text-warning-700">
            Não temos como confirmar por aqui se a mensagem foi entregue — o provedor de destino
            pode atrasar ou recusar o e-mail sem avisar esta tela. Depois de um reenvio e cerca de
            10 minutos sem nada,{" "}
            <a
              href={SUPPORT_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2"
            >
              fale com a equipe no WhatsApp
            </a>{" "}
            informando o e-mail que você usou no cadastro. Sua conta já existe e não se perde.
          </p>
        </section>

        <p className="text-center text-sm text-neutral-600">
          Já confirmou?{" "}
          <Link
            href={next ? `/auth/entrar?next=${encodeURIComponent(next)}` : "/auth/entrar"}
            className="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-800"
          >
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
