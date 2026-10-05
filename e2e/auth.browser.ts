import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const origin = "http://localhost:5189";
const cookieName = "sipeg_fixture_refresh";
const alice = "alice@example.test";
const bob = "bob@example.test";

async function installApi(context: BrowserContext) {
  let identity: string | null = null;
  let refreshCookie: string | null = null;
  let sequence = 0;
  let activeRefreshes = 0;
  const accessTokens = new Map<string, string>();
  const stats = { refreshes: 0, unauthorized: 0, maxConcurrentRefreshes: 0, logouts: 0 };
  const unexpected: string[] = [];

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      unexpected.push(request.url());
      await route.abort();
      return;
    }
    if (!url.pathname.startsWith("/api/")) {
      await route.continue();
      return;
    }
    const headers = await request.allHeaders();
    const suppliedCookie = headers["cookie"]
      ?.split("; ")
      .find((entry) => entry.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    const reply = (data: unknown, cookie?: string) =>
      route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { "Set-Cookie": cookie } : {}),
        },
        body: JSON.stringify({ success: true, message: "ok", data }),
      });
    const reject = async () => {
      stats.unauthorized += 1;
      await route.fulfill({ status: 401, json: { success: false, message: "rejected" } });
    };
    const issue = async () => {
      sequence += 1;
      refreshCookie = `fixture-refresh-${sequence}`;
      const accessToken = `fixture-access-${sequence}`;
      accessTokens.set(accessToken, identity!);
      await reply(
        {
          accessToken,
          tokenType: "Bearer",
          accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
        `${cookieName}=${refreshCookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`,
      );
    };

    if (url.pathname === "/api/v1/auth/login" && request.method() === "POST") {
      const credentials = request.postDataJSON() as { email: string; password: string };
      expect(credentials.password).toBe("fixture-only");
      expect([alice, bob]).toContain(credentials.email);
      identity = credentials.email;
      await issue();
    } else if (url.pathname === "/api/v1/auth/refresh" && request.method() === "POST") {
      expect(request.postData()).toBeNull();
      stats.refreshes += 1;
      activeRefreshes += 1;
      stats.maxConcurrentRefreshes = Math.max(stats.maxConcurrentRefreshes, activeRefreshes);
      // Consume before responding: any concurrent reuse MUST get 401.
      const valid = identity !== null && refreshCookie !== null && suppliedCookie === refreshCookie;
      if (valid) refreshCookie = null;
      await new Promise((resolve) => setTimeout(resolve, 100));
      try {
        if (valid) await issue();
        else await reject();
      } finally {
        activeRefreshes -= 1;
      }
    } else if (url.pathname === "/api/v1/users/me" && request.method() === "GET") {
      const email = accessTokens.get(headers["authorization"]?.replace(/^Bearer /, "") ?? "");
      if (!email) return reject();
      await reply({
        id: email === alice ? "user-1" : "user-2",
        email,
        firstName: email === alice ? "Alice" : "Bob",
        lastName: "Fixture",
        identificationNumber: "fixture-id",
        globalRole: "USER",
        career: null,
        unit: null,
      });
    } else if (url.pathname === "/api/v1/auth/logout" && request.method() === "POST") {
      expect(request.postData()).toBeNull();
      expect(suppliedCookie).toBe(refreshCookie);
      stats.logouts += 1;
      identity = null;
      refreshCookie = null;
      accessTokens.clear();
      await reply({}, `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    } else {
      unexpected.push(`${request.method()} ${request.url()}`);
      await route.abort();
    }
  });
  return { stats, unexpected };
}

async function open(page: Page) {
  await page.goto("/e2e/auth.fixture.html");
  await page.waitForFunction(() => Boolean(window.authHarness));
  expect(
    await page.evaluate(() => ({
      secure: isSecureContext,
      locks: typeof navigator.locks.request,
      channel: typeof BroadcastChannel,
    })),
  ).toEqual({ secure: true, locks: "function", channel: "function" });
}

async function expectPrivate(pages: Page[]) {
  for (const page of pages) {
    expect(
      await page.evaluate(() => ({
        cookie: document.cookie,
        local: { ...localStorage },
        session: { ...sessionStorage },
      })),
    ).toEqual({ cookie: "", local: {}, session: {} });
    const messages = await page.evaluate(() => window.authHarness.messages);
    for (const message of messages) {
      expect(
        ["session-established", "session-renewed", "session-ended"].map((kind) => ({ kind })),
      ).toContainEqual(message);
    }
  }
}

test("login A, restore B, recargas, cambio de identidad y logout por canal real", async ({
  page: a,
  context,
}) => {
  const api = await installApi(context);
  await open(a);
  await a.evaluate((email) => window.authHarness.login(email), alice);
  const cookies = await context.cookies();
  expect(cookies).toEqual([
    expect.objectContaining({ name: cookieName, httpOnly: true, sameSite: "Lax" }),
  ]);
  await expectPrivate([a]);

  const b = await context.newPage();
  await open(b);
  await b.evaluate(() => window.authHarness.coordinator.renew());
  await expect(b.locator("#identity")).toHaveText(alice);
  await expect(a.locator("#identity")).toHaveText(alice);
  await expectPrivate([a, b]);

  await Promise.all([a.reload(), b.reload()]);
  for (const page of [a, b]) {
    await page.waitForFunction(() => Boolean(window.authHarness));
    expect(await page.evaluate(() => window.authHarness.coordinator.getAccessToken())).toBeNull();
  }
  await Promise.all(
    [a, b].map((page) => page.evaluate(() => window.authHarness.coordinator.renew())),
  );
  for (const page of [a, b]) await expect(page.locator("#identity")).toHaveText(alice);

  await a.evaluate((email) => window.authHarness.login(email), bob);
  // No manual refresh/deliver in B: only the real BroadcastChannel can converge it.
  await expect(b.locator("#identity")).toHaveText(bob);
  await expect(a.locator("#identity")).toHaveText(bob);
  await expect
    .poll(() => b.evaluate(() => window.authHarness.messages))
    .toContainEqual({ kind: "session-established" });
  await expectPrivate([a, b]);
  await a.evaluate(() => window.authHarness.logout());
  for (const page of [a, b]) {
    await expect(page.locator("#identity")).toHaveText("anónimo");
    expect(await page.evaluate(() => window.authHarness.coordinator.getAccessToken())).toBeNull();
  }
  await expect
    .poll(() => b.evaluate(() => window.authHarness.messages))
    .toContainEqual({ kind: "session-ended" });
  expect(await context.cookies()).toEqual([]);
  await expectPrivate([a, b]);
  expect(api.stats.unauthorized).toBe(0);
  expect(api.stats.logouts).toBe(1);
  expect(api.unexpected).toEqual([]);
  // A reload cannot restore the revoked cookie session.
  await open(b);
  expect(
    await b.evaluate(() =>
      window.authHarness.coordinator.renew().then(
        () => "restored",
        () => "rejected",
      ),
    ),
  ).toBe("rejected");
  await expect(b.locator("#identity")).toHaveText("anónimo");
  expect(api.stats.unauthorized).toBe(1);
});

test("renovaciones simultáneas esperan Web Lock nativo y rotan sin 401", async ({
  page: a,
  context,
}) => {
  const api = await installApi(context);
  await open(a);
  await a.evaluate((email) => window.authHarness.login(email), alice);
  const b = await context.newPage();
  await open(b);
  await b.evaluate(() => window.authHarness.coordinator.renew());
  const before = api.stats.refreshes;
  const cookieBefore = (await context.cookies())[0]!.value;

  // Hold the actual production lock; wait until BOTH tabs have queued on it.
  await a.evaluate(() => {
    void navigator.locks.request(
      `sipeg-auth-cookie:${location.origin}`,
      () =>
        new Promise<void>((resolve) => {
          window.authHarness.releaseLock = resolve;
        }),
    );
  });
  await expect
    .poll(() => a.evaluate(async () => (await navigator.locks.query()).held?.length))
    .toBe(1);
  await Promise.all(
    [a, b].map((page) =>
      page.evaluate(() => {
        window.authHarness.renewal = Promise.all([
          window.authHarness.coordinator.renew(),
          window.authHarness.coordinator.renew(),
        ]).then(() => undefined);
      }),
    ),
  );
  await expect
    .poll(() => a.evaluate(async () => (await navigator.locks.query()).pending?.length))
    .toBe(2);
  expect(api.stats.refreshes).toBe(before);
  await a.evaluate(() => window.authHarness.releaseLock());
  await Promise.all([a, b].map((page) => page.evaluate(() => window.authHarness.renewal)));
  expect(api.stats.refreshes - before).toBe(2);
  expect(api.stats.maxConcurrentRefreshes).toBe(1);
  expect(api.stats.unauthorized).toBe(0);
  expect((await context.cookies())[0]!.value).not.toBe(cookieBefore);
  for (const page of [a, b]) await expect(page.locator("#identity")).toHaveText(alice);
  await expectPrivate([a, b]);
  expect(api.unexpected).toEqual([]);
});

test("control negativo: reutilizar cookie sin coordinador ni lock produce 401", async ({
  page,
  context,
}) => {
  const api = await installApi(context);
  await open(page);
  await page.evaluate((email) => window.authHarness.login(email), alice);
  const statuses = await page.evaluate(async () =>
    Promise.all(
      [1, 2].map(async () => {
        const response = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        return response.status;
      }),
    ),
  );
  expect(statuses.sort()).toEqual([200, 401]);
  expect(api.stats.maxConcurrentRefreshes).toBe(2);
  expect(api.stats.unauthorized).toBe(1);
  expect(api.unexpected).toEqual([]);
});
