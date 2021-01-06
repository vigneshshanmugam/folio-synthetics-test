import { journey, expect } from "./src";

journey("Test playwright page", async ({ page, session }) => {
  await page.goto("https://playwright.dev/");
  const name = await page.innerText(".navbar__title");
  expect(name).toBe("Playwright");
});
