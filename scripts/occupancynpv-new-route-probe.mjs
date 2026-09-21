const origin = "https://occupancynpv.com";
const routes = [
  "/occupancynpv/app",
  "/occupancynpv/app/login",
  "/occupancynpv/app/checkout/complete",
  "/api/occupancynpv/me",
  "/api/checkout/start",
  "/terms-of-service/",
  "/pricing/",
];
for (const route of routes) {
  const res = await fetch(`${origin}${route}`, { redirect: "manual" });
  console.log(route, res.status);
}
const checkout = await fetch(`${origin}/api/checkout/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ offer: "PROFESSIONAL" }),
});
const json = await checkout.json().catch(() => ({}));
console.log("checkout_post", checkout.status, json.reason ?? "NONE", "createSession=", json.createSession ?? "NONE");
const terms = await fetch(`${origin}/terms-of-service/`);
const html = await terms.text();
console.log("terms_one_seat", /one authenticated user/i.test(html) ? "PASS" : "FAIL");
console.log("terms_annual", /Billing is annual/i.test(html) ? "PASS" : "FAIL");
console.log("terms_paid_through", /already-paid billing period/i.test(html) ? "PASS" : "FAIL");
console.log("terms_7_day", /7 calendar days/i.test(html) ? "PASS" : "FAIL");
console.log("terms_one_workspace", /one DealWorkspace/i.test(html) ? "PASS" : "FAIL");
console.log("terms_unlimited", /\bunlimited\b/i.test(html) ? "PRESENT" : "NONE");
console.log("pricing_unlimited", /\bunlimited\b/i.test(await (await fetch(`${origin}/pricing/`)).text()) ? "PRESENT" : "NONE");
console.log("app_share_export", /shareable URL|download\/export|generated PDF/i.test(html) ? "PRESENT" : "NONE");
