const origin = "https://occupancynpv.com";
const terms = await fetch(`${origin}/terms-of-service/`);
const html = await terms.text();
console.log("terms_status:", terms.status);
console.log("terms_one_seat:", /one authenticated user/i.test(html) ? "PASS" : "FAIL");
console.log("terms_annual:", /Billing is annual/i.test(html) ? "PASS" : "FAIL");
console.log("terms_paid_through:", /already-paid billing period/i.test(html) ? "PASS" : "FAIL");
console.log("terms_7_day:", /7 calendar days/i.test(html) ? "PASS" : "FAIL");
console.log("terms_one_workspace:", /one DealWorkspace/i.test(html) ? "PASS" : "FAIL");
console.log("terms_unlimited:", /\bunlimited\b/i.test(html) ? "FAIL" : "NONE");
const checkout = await fetch(`${origin}/api/checkout/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ offer: "PROFESSIONAL" }),
});
const json = await checkout.json().catch(() => ({}));
console.log("checkout_status:", checkout.status);
console.log("checkout_reason:", json.reason ?? json.error ?? "NONE");
const login = await fetch(`${origin}/occupancynpv/app/login`, { redirect: "manual" });
console.log("login_status:", login.status);
const app = await fetch(`${origin}/occupancynpv/app`, { redirect: "manual" });
console.log("app_status:", app.status);
const https = await fetch(origin, { redirect: "manual" });
console.log("https_home:", https.status);
const www = await fetch("https://www.occupancynpv.com", { redirect: "manual" });
console.log("www_status:", www.status);
console.log("www_location:", www.headers.get("location") ?? "NONE");
