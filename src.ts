import { config, folio as baseFolio } from "folio";
import { chromium } from "playwright-chromium";
import type {
  ChromiumBrowser,
  BrowserContextOptions,
  ChromiumBrowserContext,
  CDPSession,
  LaunchOptions,
  Page,
} from "playwright-chromium";
import { NetworkManager } from "./plugins";

config.timeout = 30000;

type PlaywrightParameters = {
  headless: boolean;
  network: boolean;
};

type PlaywrightWorkerFixtures = {
  playwrightChromium: typeof import("playwright-chromium");
  browserOptions: LaunchOptions;
  browser: ChromiumBrowser;
};

type PlaywrightTestFixtures = {
  contextOptions: BrowserContextOptions;
  session: CDPSession;
  contextFactory: (
    options?: BrowserContextOptions
  ) => Promise<ChromiumBrowserContext>;
  context: ChromiumBrowserContext;
  page: Page;
};

const fixtures = baseFolio.extend<
  PlaywrightTestFixtures,
  PlaywrightWorkerFixtures,
  PlaywrightParameters
>();

fixtures.headless.initParameter(
  "Whether to run tests headless or headful",
  false
);
fixtures.network.initParameter("Whether to capture network events", true);

fixtures.browserOptions.init(
  async ({ headless }, run) => {
    await run({
      handleSIGINT: false,
      headless: !headless,
    });
  },
  { scope: "worker" }
);

fixtures.browser.init(
  async ({ browserOptions }, run) => {
    const browser = await chromium.launch(browserOptions);
    await run(browser);
    await browser.close();
  },
  { scope: "worker" }
);

fixtures.contextFactory.init(async ({ browser }, run) => {
  const contexts: ChromiumBrowserContext[] = [];
  async function contextFactory(options: BrowserContextOptions = {}) {
    const context = await browser.newContext({
      ...options,
    });
    contexts.push(context);
    return context;
  }
  await run(contextFactory);
  for (const context of contexts) await context.close();
});

fixtures.context.init(async ({ contextFactory }, run) => {
  const context = await contextFactory();
  await run(context);
});

fixtures.page.init(async ({ context }, run) => {
  await run(await context.newPage());
});

fixtures.session.init(async ({ context, page, network }, run) => {
  const session = await context.newCDPSession(page);
  const manager = new NetworkManager();
  manager.start(session);
  await run(session);
  const output = await manager.stop();
});

export const folio = fixtures.build();
export const journey = folio.it;
export const fjourney = folio.fit;
export const xjourney = folio.xit;
export const beforeEach = folio.beforeEach;
export const afterEach = folio.afterEach;
export const beforeAll = folio.beforeAll;
export const afterAll = folio.afterAll;
export { expect, config } from "folio";
