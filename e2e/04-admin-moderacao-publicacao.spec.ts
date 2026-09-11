import { test, expect } from "@playwright/test";

import { FIXTURE, loginAs, logout, startDraftSubmission, addWizardItem, submitWizard } from "./fixtures";

/**
 * Journey 4 (Prompt 17): admin -> moderação -> publicação. Creates its
 * own submission (independent of journey 3's, same real wizard) so this
 * spec can run standalone, then proves the full moderation loop actually
 * publishes it: the new série/lista becomes visible on the school's
 * PUBLIC page afterward, not just "the button didn't error".
 */
test("submissão pendente -> iniciar revisão -> aprovar e publicar -> visível publicamente", async ({ page }) => {
  const seriesName = "7º Ano E2E Prompt17 Moderação";

  await loginAs(page, FIXTURE.users.user);
  const submissionId = await startDraftSubmission(page, { seriesName, schoolYear: String(FIXTURE.list.schoolYear) });
  await addWizardItem(page, "Régua E2E Prompt17");
  await submitWizard(page);
  await expect(page.getByRole("heading", { name: "Lista enviada!" })).toBeVisible();
  await logout(page);

  await loginAs(page, FIXTURE.users.admin);
  await page.goto("/admin/moderacao");
  await expect(page.getByRole("heading", { name: "Moderação" })).toBeVisible();
  // Another pending submission can legitimately exist for the same
  // school (e.g. journey 3's own, never moderated by any test) -- the
  // school name alone doesn't identify a row, so confirm this specific
  // submission is queued, then go straight to it by id.
  await expect(page.locator(`a[href="/admin/moderacao/${submissionId}"]`)).toBeVisible();

  await page.goto(`/admin/moderacao/${submissionId}`);
  await expect(page.getByRole("heading", { name: FIXTURE.school.name, level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Iniciar revisão" }).click();
  // No redirect on success (revalidatePath only) -- the UI proof is the
  // status flipping from SUBMITTED to UNDER_REVIEW, which swaps which
  // form ReviewActions renders.
  await expect(page.getByRole("button", { name: "Aprovar e publicar" })).toBeVisible();

  await page.getByRole("button", { name: "Aprovar e publicar" }).click();
  await expect(page.getByRole("button", { name: "Iniciar revisão" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Aprovar e publicar" })).not.toBeVisible();

  // Confirm it left the default (pending-only) queue -- scoped by this
  // specific submission's id, since other pending submissions for the
  // same school could legitimately exist.
  await page.goto("/admin/moderacao");
  await expect(page.locator(`a[href="/admin/moderacao/${submissionId}"]`)).not.toBeVisible();

  await logout(page);
  await page.goto(`/escolas/${FIXTURE.school.uf.toLowerCase()}/${FIXTURE.school.municipality.toLowerCase()}/${FIXTURE.school.slug}`);
  await expect(page.getByText(seriesName)).toBeVisible();
});
