# Cloud Runtime Productionization V1

Dedicated runtime project: `infinity-runtime` (`prj_wtUAxwdCx7V6ptAg2omUEWbHg6ox`) at https://infinity-runtime.vercel.app

## Status

Cloud durable state, Vercel Cron wakes, atomic lease, idempotency, catch-up, and HQ observer projection are implemented.

Production autonomy does not use `.infinity/autonomous-operating-loop/state.json` as source of truth.

## Scheduler

- Hourly operating tick: `GET /api/runtime/tick` (`0 * * * *`)
- Daily portfolio review: `GET /api/runtime/venture-operating-cycle` (`0 12 * * *`)
- Event/manual wake: `POST /api/runtime/wake`
- Operating state: `GET /api/runtime/operating-state`

Cron wakes the runtime. Cron is not the business logic. Each wake acquires a lease, loads durable state, evaluates the Autonomous Daily Operating Loop, persists, and releases the lease.

## Health

HEALTHY requires a successful bounded iteration (load, lease, persist, next wake), not merely HTTP 200.

## Cutover

When `VERCEL=1` or `INFINITY_CLOUD_RUNTIME_AUTHORITY=1`, local production schedulers stay disabled. Developer-local test runs remain allowed.

## Not activated by this milestone

- Real sales outreach
- Real affiliate outreach
- Live affiliate payouts
- Paid acquisition
- Autonomous financial commitments
- Unrestricted money movement
