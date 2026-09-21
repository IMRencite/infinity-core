const tick = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-tick").then((res) => res.status).catch(() => 0);
const attest = await fetch("https://infinity-runtime.vercel.app/api/runtime/communication-attest").then((res) => res.status).catch(() => 0);
console.log(JSON.stringify({
  serving_tick: tick,
  serving_attest: attest,
  now: new Date().toISOString(),
}, null, 2));
