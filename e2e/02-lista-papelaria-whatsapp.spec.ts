import { test, expect } from "@playwright/test";

import { FIXTURE } from "./fixtures";

/**
 * Journey 2 (Prompt 17): lista -> papelaria -> WhatsApp. Anonymous,
 * "Comprar local" section -- the papelaria never processes payment,
 * everything terminates in a WhatsApp deep link (CLAUDE.md: proibido
 * checkout/PIX/cartão/etc.).
 */
test("lista -> papelarias próximas -> WhatsApp", async ({ page }) => {
  await page.goto(`/listas/${FIXTURE.list.slug}`);
  await expect(page.getByRole("heading", { name: "Comprar local" })).toBeVisible();

  await page.getByRole("button", { name: "Ver papelarias próximas" }).click();
  const dialog = page.getByRole("dialog", { name: "Papelarias próximas" });
  await expect(dialog).toBeVisible();

  const storeCard = dialog.getByText(FIXTURE.store.name);
  await expect(storeCard).toBeVisible();

  const whatsappLink = dialog.getByRole("link", { name: "Pedir orçamento no WhatsApp" });
  await expect(whatsappLink).toBeVisible();
  const href = await whatsappLink.getAttribute("href");
  expect(href).toContain(`/api/store/whatsapp?store=${FIXTURE.store.id}`);
  expect(href).toContain(`school=${FIXTURE.school.id}`);
  expect(href).toContain(`list=${FIXTURE.list.id}`);

  // Same reasoning as journey 1's partner redirect: verify server-side
  // rather than actually navigating a browser to wa.me.
  const response = await page.request.get(href!, { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const location = response.headers()["location"];
  expect(location).toContain("https://wa.me/5565999990000");
  // URLSearchParams encodes spaces as "+", which decodeURIComponent
  // leaves alone (that's form-encoding, not URI-encoding) -- normalize
  // before comparing against a space-containing string.
  expect(decodeURIComponent(location.replace(/\+/g, " "))).toContain(FIXTURE.school.name);
});
