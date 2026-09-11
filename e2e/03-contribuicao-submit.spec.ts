import { test, expect } from "@playwright/test";

import { FIXTURE, loginAs, startDraftSubmission, addWizardItem, submitWizard } from "./fixtures";

/**
 * Journey 3 (Prompt 17): anon -> login -> contribuição -> submit. The
 * full enviar-lista wizard, driven the same way a real visitor would --
 * no direct DB inserts standing in for any of the 5 steps.
 */
test("login -> enviar-lista (escola -> série/ano -> itens -> anexo -> revisão) -> confirmação", async ({ page }) => {
  // Anon hitting the gated area first -- proves the redirect-then-return
  // path works, not just a direct login.
  await page.goto("/enviar-lista");
  await page.waitForURL(/\/auth\/entrar\?next=/);

  await loginAs(page, FIXTURE.users.user);
  // getSafeRedirect should have carried us back to /enviar-lista post-login.
  await page.waitForURL("/enviar-lista");

  await startDraftSubmission(page, { seriesName: "6º Ano E2E Prompt17", schoolYear: String(FIXTURE.list.schoolYear) });
  await expect(page.getByRole("heading", { name: "Itens da lista" })).toBeVisible();

  await addWizardItem(page, "Caderno E2E Prompt17");
  await submitWizard(page);

  await expect(page.getByRole("heading", { name: "Lista enviada!" })).toBeVisible();
  await expect(
    page.getByText("Sua lista foi enviada para moderação. Você será avisado quando ela for revisada.")
  ).toBeVisible();
});
