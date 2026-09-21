const me = await fetch("https://occupancynpv.com/api/occupancynpv/me");
console.log("me_status", me.status);
console.log("me_body", (await me.text()).slice(0, 500));
const signup = await fetch("https://occupancynpv.com/api/occupancynpv/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "not-an-email", password: "short" }),
});
console.log("signup_status", signup.status);
console.log("signup_body", (await signup.text()).slice(0, 300));
const pricing = await fetch("https://occupancynpv.com/pricing/");
const html = await pricing.text();
const idx = html.toLowerCase().indexOf("unlimited");
console.log("pricing_status", pricing.status);
console.log("pricing_unlimited_context", idx >= 0 ? html.slice(Math.max(0, idx - 80), idx + 80).replace(/\s+/g, " ") : "NONE");
