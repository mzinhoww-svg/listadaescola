import { test, expect } from "@playwright/test";

import { FIXTURE } from "./fixtures";

/**
 * Journey 1 (Prompt 17): busca -> escola -> lista -> parceiro. Anonymous
 * the whole way through -- this is the site's core discovery path, never
 * gated behind auth.
 */
test("busca por nome -> escola -> lista -> oferta de parceiro", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Encontre a escola, descubra a lista." })).toBeVisible();

  await page.getByLabel("Ou busque pelo nome da escola").fill(FIXTURE.school.searchTerm);
  await page.getByRole("button", { name: "Buscar escola" }).click();
  await page.waitForURL(/\/escolas\?q=/);

  await expect(page.getByRole("heading", { name: FIXTURE.school.name, level: 3 })).toBeVisible();
  await page.getByRole("link", { name: "Ver escola" }).click();
  await page.waitForURL(new RegExp(`/escolas/mt/.*/${FIXTURE.school.slug}$`));

  await expect(page.getByRole("heading", { name: FIXTURE.school.name, level: 1 })).toBeVisible();
  const listLink = page.getByRole("link", { name: `Ano letivo ${FIXTURE.list.schoolYear}` }).first();
  await expect(listLink).toBeVisible();
  await listLink.click();
  await page.waitForURL(`/listas/${FIXTURE.list.slug}`);

  await expect(page.getByRole("heading", { name: FIXTURE.list.seriesName, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comprar online" })).toBeVisible();

  const partnerLink = page.getByRole("link", { name: /Ver produto/ });
  await expect(partnerLink).toBeVisible();
  const href = await partnerLink.getAttribute("href");
  expect(href).toContain("/api/commerce/click?product=");

  // Redirect verified server-side (never following into the real
  // external site from an automated test) -- confirms the trusted
  // external_url from admin-only data, not anything the client sent.
  const response = await page.request.get(href!, { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toBe("https://example.com/produto/e2e-p17");
});
