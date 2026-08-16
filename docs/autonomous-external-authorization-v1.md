# Autonomous External Action Authorization v1

Infinity uses **policy-based autonomy**. Human approval is the exception, not the default for governed, low-risk, zero-cost external actions that pass all gates.

## Decision outcomes

The canonical evaluator returns exactly one:

- **AUTO_AUTHORIZE** — persist governed approval (`authorization_source = autonomous_policy`) and advance to `simulation_ready` or `execution_ready`.
- **REQUIRE_HUMAN_APPROVAL** — persist `awaiting_approval` with structured escalation reasons.
- **BLOCK** — hard deny (invalid artifact, unknown action, credential failure, etc.).

## Authorization sources

- `autonomous_policy`
- `human`
- `system_test`
- `denied`

Recorded on `external_action_approvals` (extended; no parallel approval system).

## v1 auto-authorize scope (zero-cost test policy)

Only when organization autonomy is enabled **and** (for live execute) `LIVE_PROVIDER_TEST_MODE=true` on the controlled development org:

- `repository.create`
- `repository.push`
- `hosting.create_project`
- `hosting.deploy`
- `hosting.verify_deployment`

Default monetary autonomous limits: **$0** (`AUTONOMOUS_EXTERNAL_MAX_*_USD`).

## Gateway

Execution accepts **human approval OR valid autonomous authorization** via the same External Action Gateway path (`launch.execute_external_action` / `launch.simulate_external_action`). Workers use `launch.evaluate_external_authorization` first; they never call providers directly.

## Policy key

`autonomous_external_action_policy_v1`
