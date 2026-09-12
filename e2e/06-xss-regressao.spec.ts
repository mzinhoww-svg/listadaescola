import { test, expect } from "@playwright/test";

import { FIXTURE, loginAs, logout, startDraftSubmission, addWizardItem, submitWizard } from "./fixtures";

/**
 * Regressão de XSS armazenado (hardening pós-MVP: "confirmar que input do
 * usuário nunca vira HTML executável" em escola/lista/avaliação/
 * observação de contribuição). Varredura estática em toda src/ (feita
 * antes de escrever este arquivo) confirma que a aplicação nunca usa
 * dangerouslySetInnerHTML nem markdown/HTML para conteúdo enviado por
 * usuário -- o único uso de dangerouslySetInnerHTML no projeto é JSON-LD
 * via jsonLdScript() (src/lib/seo/json-ld.ts), que já escapa "</script>"
 * (SEC-005). Todo campo de texto livre (comentário de avaliação, nome de
 * item de lista, série/ano) passa por interpolação JSX comum ({valor}),
 * que o React escapa por padrão -- inclusive na tela de moderação
 * (interna, não pública), onde o mesmo texto não confiável também precisa
 * nunca ser executável.
 *
 * Este arquivo trava esse comportamento como regressão real, ponta a
 * ponta pelas mesmas telas que usuário/moderador realmente usam -- não um
 * teste unitário de um helper de escape isolado. Cada teste registra um
 * listener de `dialog`: um payload que dispara alert() de verdade (ex.
 * <img onerror>, que executa mesmo quando inserido via innerHTML --
 * diferente de <script> puro, que navegadores nunca executam mesmo em
 * HTML injetado) faz o teste falhar imediatamente.
 */

const SCRIPT_PAYLOAD = `<script>alert('xss-e2e-review')</script>`;
const IMG_PAYLOAD = `<img src=x onerror="alert('xss-e2e-item')">`;

function schoolPath(): string {
  return `/escolas/${FIXTURE.school.uf.toLowerCase()}/${FIXTURE.school.municipality.toLowerCase()}/${FIXTURE.school.slug}`;
}

test("XSS: comentário de avaliação nunca executa, mesmo aprovado e publicado", async ({ page }) => {
  page.on("dialog", (dialog) => {
    throw new Error(`XSS: dialog inesperado disparou -- payload executado: ${dialog.message()}`);
  });

  await loginAs(page, FIXTURE.users.user);
  await page.goto(schoolPath());
  await page.getByLabel("Nota").selectOption("5");
  await page.getByLabel("Comentário (opcional)").fill(SCRIPT_PAYLOAD);
  await page.getByRole("button", { name: "Enviar avaliação" }).click();
  await expect(page.getByText("Avaliação enviada para moderação. Obrigado!")).toBeVisible();
  await logout(page);

  // Fila de moderação: tela interna (só admin), mas o comentário de um
  // autor não confiável ainda precisa aparecer só como texto para o
  // moderador ler -- nunca como HTML executável.
  await loginAs(page, FIXTURE.users.admin);
  await page.goto("/admin/moderacao/avaliacoes");
  const queueRow = page.getByRole("row").filter({ hasText: SCRIPT_PAYLOAD });
  await expect(queueRow).toBeVisible();
  await expect(page.locator("script", { hasText: "xss-e2e-review" })).toHaveCount(0);

  await queueRow.getByRole("button", { name: "Aprovar" }).click();
  await expect(queueRow).not.toBeVisible();
  await logout(page);

  await page.goto(schoolPath());
  await expect(page.getByText(SCRIPT_PAYLOAD)).toBeVisible();
  await expect(page.locator("script", { hasText: "xss-e2e-review" })).toHaveCount(0);
});

test("XSS: nome de item de lista nunca executa, do rascunho à lista pública", async ({ page }) => {
  page.on("dialog", (dialog) => {
    throw new Error(`XSS: dialog inesperado disparou -- payload executado: ${dialog.message()}`);
  });
  const seriesName = "XSS E2E Teste Item";

  await loginAs(page, FIXTURE.users.user);
  const submissionId = await startDraftSubmission(page, { seriesName, schoolYear: String(FIXTURE.list.schoolYear) });
  await addWizardItem(page, IMG_PAYLOAD);
  // addWizardItem já espera o texto do payload voltar visível na tela
  // (render client-side, antes de qualquer moderação) -- o count abaixo
  // reforça que o elemento <img> malicioso em si nunca existe no DOM.
  await expect(page.locator("img[src=x]")).toHaveCount(0);
  await submitWizard(page);
  await logout(page);

  await loginAs(page, FIXTURE.users.admin);
  await page.goto(`/admin/moderacao/${submissionId}`);
  await expect(page.getByText(IMG_PAYLOAD)).toBeVisible();
  await expect(page.locator("img[src=x]")).toHaveCount(0);

  await page.getByRole("button", { name: "Iniciar revisão" }).click();
  await page.getByRole("button", { name: "Aprovar e publicar" }).click();
  await expect(page.getByRole("button", { name: "Aprovar e publicar" })).not.toBeVisible();
  await logout(page);

  await page.goto(schoolPath());
  // Escopado ao parágrafo da série específica deste teste (CSS "+ div a" --
  // o mesmo <div> de links "Ano letivo N" que fixtures.ts documenta) já
  // que outras séries/anos legítimos coexistem na mesma escola.
  await page.locator(`p:text-is("${seriesName}") + div a`).click();
  await page.waitForURL(/\/listas\//);
  await expect(page.getByText(IMG_PAYLOAD)).toBeVisible();
  await expect(page.locator("img[src=x]")).toHaveCount(0);
});
