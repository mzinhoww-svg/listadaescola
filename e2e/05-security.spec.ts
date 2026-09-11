import { test, expect } from "@playwright/test";

import { FIXTURE, loginAs, logout, startDraftSubmission } from "./fixtures";

/**
 * Prompt 17: "Testar IDOR, RBAC, open redirect, upload, estados de erro
 * e redirecionamento externo. Esconder botão nunca substitui autorização
 * de backend." Each case below hits the real server-side gate, never a
 * frontend affordance -- most of these have no button to hide in the
 * first place (a direct URL/request is the whole point).
 */

test("IDOR: usuário B não acessa submissão do usuário A por id direto", async ({ page }) => {
  await loginAs(page, FIXTURE.users.user);
  const submissionId = await startDraftSubmission(page, { seriesName: "IDOR Teste E2E", schoolYear: String(FIXTURE.list.schoolYear) });
  await logout(page);

  await loginAs(page, FIXTURE.users.userB);
  await page.goto(`/enviar-lista/${submissionId}/itens`);
  // getOwnSubmissionDetail scopes by submitted_by = auth.uid() -- a
  // foreign id collapses to the exact same outcome as a nonexistent one,
  // never a distinguishable "not yours" vs "doesn't exist" response.
  await expect(page).toHaveURL("/enviar-lista");
});

test("IDOR público: lista não aprovada/publicada -> 404, não conteúdo", async ({ page }) => {
  const response = await page.goto("/listas/e2e-p17-nao-existe-nunca-foi-criada");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
});

test("RBAC: visitante anônimo em /admin é redirecionado para login", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(200); // final response after following the redirect
  await expect(page).toHaveURL("/auth/entrar?next=%2Fadmin");
});

test("RBAC: usuário autenticado não-admin vê Acesso restrito em /admin (não é redirecionado)", async ({ page }) => {
  await loginAs(page, FIXTURE.users.user);
  await page.goto("/admin");
  // Hiding the admin nav link is not authorization -- this proves the
  // page itself refuses to render admin content for a non-admin session.
  await expect(page).toHaveURL("/admin");
  await expect(page.getByText("Acesso restrito")).toBeVisible();
  await expect(page.getByText("Sua conta não tem permissão para acessar a administração.")).toBeVisible();
});

test("open redirect: ?next= externo nunca sai do site, mesmo após login", async ({ page }) => {
  await page.goto("/auth/entrar?next=https://evil.example.com");
  // getSafeRedirect sanitizes before the hidden field is ever rendered.
  await expect(page.locator('input[name="next"]')).toHaveValue("/minha-conta");

  await page.getByLabel("E-mail").fill(FIXTURE.users.user.email);
  await page.getByLabel("Senha").fill(FIXTURE.users.user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Re-sanitized again server-side at submit time -- lands on the safe
  // fallback, never anywhere resembling evil.example.com. waitForURL
  // (not expect(...).toHaveURL, whose default timeout is tighter) since
  // this crosses a real Server Action + redirect + first-hit dev-server
  // compile of /minha-conta.
  await page.waitForURL("/minha-conta");
});

test("estado de erro: busca sem resultado mostra empty state, não uma página quebrada", async ({ page }) => {
  await page.goto("/escolas?q=zzz-termo-que-nao-existe-e2e-p17-xyz");
  await expect(page.getByText("Nenhuma escola encontrada")).toBeVisible();
  await expect(page.getByText("Tente ajustar os filtros, a localização ou o termo de busca.")).toBeVisible();
});

test("upload: tipo de arquivo não permitido é rejeitado pelo servidor", async ({ page }) => {
  await loginAs(page, FIXTURE.users.user);
  const response = await page.request.post("/api/contributions/attachments", {
    multipart: {
      submission_id: "00000000-0000-0000-0000-000000000000",
      file: { name: "malicioso.txt", mimeType: "text/plain", buffer: Buffer.from("not a pdf") },
    },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: "Envie um PDF, JPG ou PNG." });
});

test("upload: arquivo acima de 10MB é rejeitado pelo servidor", async ({ page }) => {
  await loginAs(page, FIXTURE.users.user);
  const oversized = Buffer.alloc(10 * 1024 * 1024 + 1);
  const response = await page.request.post("/api/contributions/attachments", {
    multipart: {
      submission_id: "00000000-0000-0000-0000-000000000000",
      file: { name: "grande.pdf", mimeType: "application/pdf", buffer: oversized },
    },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: "O arquivo deve ter no máximo 10MB." });
});

test("upload: anônimo é rejeitado antes de qualquer validação de arquivo", async ({ page }) => {
  const response = await page.request.post("/api/contributions/attachments", {
    multipart: {
      submission_id: "00000000-0000-0000-0000-000000000000",
      file: { name: "qualquer.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") },
    },
  });
  expect(response.status()).toBe(401);
});

test("redirecionamento externo: parâmetro inválido cai em fallback seguro, nunca em URL fabricada", async ({ page }) => {
  const commerceResponse = await page.request.get("/api/commerce/click?product=not-a-uuid", { maxRedirects: 0 });
  expect(commerceResponse.status()).toBe(307);
  expect(commerceResponse.headers()["location"]).toMatch(/\/$/);

  const whatsappResponse = await page.request.get("/api/store/whatsapp?store=00000000-0000-0000-0000-000000000000", {
    maxRedirects: 0,
  });
  expect(whatsappResponse.status()).toBe(307);
  expect(whatsappResponse.headers()["location"]).toMatch(/\/$/);
});
