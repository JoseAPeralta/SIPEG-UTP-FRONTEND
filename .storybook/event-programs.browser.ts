import { expect, test, type Page } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

/**
 * Comprobaciones de navegador para el modulo de programas: teclado real, reflujo movil, objetivos
 * tactiles y axe. Se ejecutan dentro de la puerta de Storybook y solo cuando la corrida incluye
 * stories de programas, de modo que una corrida acotada de otro modulo no las arrastre.
 */

const DEFAULT_STORY = "features-event-programs-eventprogramsview--default";
const PROGRAM_STORY_PREFIX = "features-event-programs-";
const MOBILE_VIEWPORT = { height: 720, width: 320 };
const MIN_TARGET_SIZE = 24;

const requestedStoryIds = (process.env["SIPEG_STORY_IDS"] ?? "").split(/[\s,]+/).filter(Boolean);
const runsProgramChecks =
  requestedStoryIds.length === 0 ||
  requestedStoryIds.some((id) => id.startsWith(PROGRAM_STORY_PREFIX));

test.skip(!runsProgramChecks, "Las comprobaciones de programas solo corren con sus stories.");

async function openPrograms(page: Page) {
  await page.goto(`/iframe.html?id=${DEFAULT_STORY}&viewMode=story`);
  await expect(page.locator("#storybook-root")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Programas" })).toBeVisible();
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;

    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  });
}

async function checkStoryAccessibility(page: Page) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await checkA11y(page, "#storybook-root", { detailedReport: true });
      return;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Axe is already running")) {
        throw error;
      }
      await page.waitForTimeout(100);
    }
  }

  throw new Error("Storybook accessibility audit did not become available.");
}

test("abre el alta con teclado y mueve el foco al primer campo", async ({ page }) => {
  await openPrograms(page);

  const createButton = page.getByRole("button", { name: "Nuevo programa" });
  await createButton.focus();
  await expect(createButton).toBeFocused();
  await page.keyboard.press("Enter");

  const form = page.getByRole("form", { name: "Nuevo programa" });
  await expect(form).toBeVisible();
  await expect(form.getByRole("textbox", { name: "Nombre" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(form.getByRole("combobox", { name: "Unidad" })).toBeFocused();
});

test("refluye el alta a 320 px sin desbordamiento horizontal", async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await openPrograms(page);
  await page.getByRole("button", { name: "Nuevo programa" }).click();

  const form = page.getByRole("form", { name: "Nuevo programa" });
  await expect(form).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

  const controls = [
    form.getByRole("textbox", { name: "Nombre" }),
    form.getByRole("combobox", { name: "Unidad" }),
    form.getByLabel("Fecha inicial"),
    form.getByLabel("Fecha final"),
    form.getByRole("button", { name: "Cancelar" }),
    form.getByRole("button", { name: "Crear programa" }),
  ];

  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
    expect(box!.width).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
  }

  await injectAxe(page);
  await checkStoryAccessibility(page);
});

test("mantiene la confirmacion util y accesible a 320 px", async ({ page }) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await openPrograms(page);

  const card = page.getByRole("article", { name: "Semana de Innovacion Academica" });
  await card.getByRole("button", { name: "Archivar" }).click();

  const confirmation = page.getByRole("group", {
    name: /confirmar archivo de semana de innovacion academica/i,
  });
  await expect(confirmation).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

  for (const control of [
    confirmation.getByRole("button", { name: "Confirmar archivo" }),
    confirmation.getByRole("button", { name: "Cancelar" }),
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
    expect(box!.width).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
  }

  // El contraste de un boton solido puede degradarse en hover; se audita ese estado a proposito.
  await confirmation.getByRole("button", { name: "Confirmar archivo" }).hover();
  await injectAxe(page);
  await checkStoryAccessibility(page);
});
