/**
 * Browser auth smoke test. Requires dev server at http://localhost:3000
 * Usage:
 *   AUTH_MANUAL_TEST_EMAIL=... AUTH_MANUAL_TEST_PASSWORD=... node scripts/auth-browser-smoke.mjs
 */
import { chromium } from "playwright";

const baseUrl = process.env.AUTH_BASE_URL ?? "http://localhost:3000";
const validEmail = process.env.AUTH_MANUAL_TEST_EMAIL;
const validPassword = process.env.AUTH_MANUAL_TEST_PASSWORD;

const results = {
  invalidCredentials: "FAIL",
  validLogin: "FAIL",
  redirectToDashboard: "FAIL",
  refreshPersistence: "FAIL",
  logout: "FAIL",
  dashboardBlockedAfterLogout: "FAIL",
  relogin: "FAIL",
};

function hasAuthCookies(cookies) {
  return cookies.some((cookie) => cookie.name.includes("-auth-token"));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await context.clearCookies();
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });

  await page.fill("#email", "invalid@example.com");
  await page.fill("#password", "wrong-password-12345");
  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => {
      const button = document.querySelector('button[type="submit"]');
      return button && button.textContent?.trim() === "Sign in";
    },
    { timeout: 15_000 },
  );

  const invalidError = await page.locator('[role="alert"]').first().textContent();
  results.invalidCredentials =
    invalidError?.toLowerCase().includes("invalid") ? "PASS" : "FAIL";

  if (validEmail && validPassword) {
    await context.clearCookies();
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", validEmail);
    await page.fill("#password", validPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard**", { timeout: 20_000 });
    results.validLogin = "PASS";
    results.redirectToDashboard = page.url().includes("/dashboard") ? "PASS" : "FAIL";

    let cookies = await context.cookies();
    const cookieCreated = hasAuthCookies(cookies);

    await page.reload({ waitUntil: "networkidle" });
    results.refreshPersistence = page.url().includes("/dashboard") ? "PASS" : "FAIL";

    await page.goto(`${baseUrl}/dashboard/portfolio`, { waitUntil: "networkidle" });
    const secondRouteOk = page.url().includes("/dashboard/portfolio");

    await page.click('button:has-text("Logout")');
    await page.waitForURL("**/login**", { timeout: 15_000 });
    results.logout = page.url().includes("/login") ? "PASS" : "FAIL";

    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
    results.dashboardBlockedAfterLogout = page.url().includes("/login") ? "PASS" : "FAIL";

    await page.fill("#email", validEmail);
    await page.fill("#password", validPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 20_000 });
    results.relogin = page.url().includes("/dashboard") ? "PASS" : "FAIL";

    cookies = await context.cookies();
    console.log(
      JSON.stringify(
        {
          results,
          cookieCreated,
          cookieSurvivesRefresh: results.refreshPersistence === "PASS",
          secondRouteOk,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      JSON.stringify(
        {
          results,
          note: "Valid credential checks skipped — set AUTH_MANUAL_TEST_EMAIL and AUTH_MANUAL_TEST_PASSWORD",
        },
        null,
        2,
      ),
    );
  }
} finally {
  await browser.close();
}

process.exit(Object.values(results).every((value) => value !== "FAIL") ? 0 : 1);
