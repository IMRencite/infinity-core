"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { OccupancynpvImprovementChrome } from "../../occupancynpv-improvement-chrome";
import { ComparisonResultDialog } from "./comparison-result-dialog";
import { scenarioViewFromStored, type ComparisonResultView } from "./comparison-result-presentation";

type ScenarioForm = {
  scenario_id: string;
  scenario_name: string;
  term_months: number;
  monthly_rent: number;
  step_start: number;
  step_rent: number;
  free_rent_months: number;
  monthly_operating_expenses: number;
  one_time_cost: number;
  allowance: number;
  annual_discount_rate: number;
  created_at?: string;
};

const empty = (id: string, name: string): ScenarioForm => ({
  scenario_id: id,
  scenario_name: name,
  term_months: 12,
  monthly_rent: 1000,
  step_start: 7,
  step_rent: 1000,
  free_rent_months: 0,
  monthly_operating_expenses: 0,
  one_time_cost: 0,
  allowance: 0,
  annual_discount_rate: 0.08,
});

function formFromStored(row: {
  result?: { scenario_name?: string };
  created_at?: string;
  input?: {
    scenario_id?: string;
    scenario_name?: string;
    term_months?: number;
    annual_discount_rate?: number;
    monthly_operating_expenses?: number;
    rent_steps?: Array<{ start_month: number; monthly_rent: number }>;
    free_rent?: Array<{ end_month: number }>;
    one_time_costs?: Array<{ amount: number }>;
    allowances?: Array<{ amount: number }>;
  };
}, fallback: ScenarioForm): ScenarioForm {
  const input = row.input;
  if (!input) return fallback;
  const first = input.rent_steps?.[0];
  const second = input.rent_steps?.[1];
  return {
    scenario_id: input.scenario_id ?? fallback.scenario_id,
    scenario_name: input.scenario_name ?? row.result?.scenario_name ?? fallback.scenario_name,
    term_months: input.term_months ?? fallback.term_months,
    monthly_rent: first?.monthly_rent ?? fallback.monthly_rent,
    step_start: second?.start_month ?? fallback.step_start,
    step_rent: second?.monthly_rent ?? first?.monthly_rent ?? fallback.step_rent,
    free_rent_months: input.free_rent?.[0]?.end_month ?? 0,
    monthly_operating_expenses: input.monthly_operating_expenses ?? 0,
    one_time_cost: input.one_time_costs?.[0]?.amount ?? 0,
    allowance: input.allowances?.[0]?.amount ?? 0,
    annual_discount_rate: input.annual_discount_rate ?? fallback.annual_discount_rate,
    created_at: row.created_at,
  };
}

function defaultName(index: number): string {
  return index < 2 ? `Lease ${index === 0 ? "A" : "B"}` : `Scenario ${index + 1}`;
}

function viewFromPayload(payload: Record<string, unknown> | null): ComparisonResultView | null {
  if (!payload || typeof payload !== "object") return null;
  const scenarios = Array.isArray(payload.scenarios) ? payload.scenarios as Array<{
    result?: {
      scenario_id?: string;
      scenario_name: string;
      npv: number;
      total_nominal_occupancy_cost: number;
      annual_discount_rate: number;
      term_months: number;
    };
    input?: {
      scenario_id?: string;
      rent_steps?: Array<{ monthly_rent: number; start_month: number }>;
      free_rent?: Array<{ end_month: number }>;
      monthly_operating_expenses?: number;
      allowances?: Array<{ amount: number }>;
    };
  }> : [];
  const ids = Array.isArray(payload.compareScenarioIds) ? payload.compareScenarioIds as string[] : [];
  const comparison = payload.comparison && typeof payload.comparison === "object"
    ? payload.comparison as ComparisonResultView["comparison"] & { scenarios?: Array<{ scenario_id?: string }> }
    : null;
  const compared = ids.length >= 2
    ? scenarios.filter((row) => ids.includes(row.input?.scenario_id ?? row.result?.scenario_id ?? ""))
    : comparison?.scenarios?.length
      ? scenarios.filter((row) => comparison.scenarios!.some((item) => item.scenario_id === (row.result?.scenario_id ?? row.input?.scenario_id)))
      : scenarios.filter((row) => row.result);
  const ready = compared.filter((row) => row.result);
  if (ready.length < 2) return null;
  return {
    scenarios: ready.slice(0, 2).map((row) => scenarioViewFromStored({ result: row.result!, input: row.input })),
    comparison,
    sensitivity: Array.isArray(payload.sensitivity) ? payload.sensitivity as ComparisonResultView["sensitivity"] : [],
  };
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OccupancynpvWorkspacePage() {
  const params = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Deal workspace");
  const [scenarios, setScenarios] = useState<ScenarioForm[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const compareButtonRef = useRef<HTMLButtonElement>(null);

  function applyPayload(json: Record<string, unknown>) {
    setResult(json);
    const workspace = json.workspace && typeof json.workspace === "object" ? json.workspace as { name?: string } : null;
    if (workspace?.name) setWorkspaceName(workspace.name);
    const rows = Array.isArray(json.scenarios) ? json.scenarios as Array<{ input?: { scenario_id?: string }; result?: { scenario_name?: string }; created_at?: string }> : [];
    const next = rows.map((row, index) => formFromStored(row, empty(row.input?.scenario_id ?? `lease_${index + 1}`, defaultName(index))));
    setScenarios(next);
    const ids = Array.isArray(json.compareScenarioIds) ? json.compareScenarioIds as string[] : [];
    setCompareA((current) => ids[0] || (next.some((row) => row.scenario_id === current) ? current : next[0]?.scenario_id ?? ""));
    setCompareB((current) => ids[1] || (next.some((row) => row.scenario_id === current) ? current : next[1]?.scenario_id ?? ""));
    setEditingId((current) => (current && next.some((row) => row.scenario_id === current) ? current : next[0]?.scenario_id ?? null));
  }

  useEffect(() => {
    void fetch(`/api/occupancynpv/workspaces/${params.id}`).then(async (res) => {
      if (res.status === 401) window.location.href = "/occupancynpv/app/login";
      if (res.status === 403) setMessage("You cannot open this workspace.");
      if (!res.ok) return;
      applyPayload(await res.json() as Record<string, unknown>);
    });
  }, [params.id]);

  const editing = scenarios.find((row) => row.scenario_id === editingId) ?? null;

  function updateEditing(next: ScenarioForm) {
    setScenarios((rows) => rows.map((row) => (row.scenario_id === next.scenario_id ? next : row)));
  }

  function toInput(form: ScenarioForm) {
    const steps = form.step_start > 1 && form.step_rent !== form.monthly_rent
      ? [
          { start_month: 1, end_month: form.step_start - 1, monthly_rent: Number(form.monthly_rent) },
          { start_month: form.step_start, end_month: Number(form.term_months), monthly_rent: Number(form.step_rent) },
        ]
      : [{ start_month: 1, end_month: Number(form.term_months), monthly_rent: Number(form.monthly_rent) }];
    return {
      scenario_id: form.scenario_id,
      scenario_name: form.scenario_name,
      lease_start: "2026-01-01",
      term_months: Number(form.term_months),
      rentable_area: 1000,
      currency: "usd" as const,
      rent_steps: steps,
      free_rent: form.free_rent_months > 0 ? [{ start_month: 1, end_month: Number(form.free_rent_months) }] : [],
      monthly_operating_expenses: Number(form.monthly_operating_expenses),
      monthly_other_recurring: 0,
      one_time_costs: form.one_time_cost > 0 ? [{ month: 1, amount: Number(form.one_time_cost), label: "One-time cost" }] : [],
      allowances: form.allowance > 0 ? [{ month: 1, amount: Number(form.allowance), label: "Tenant improvement allowance" }] : [],
      annual_discount_rate: Number(form.annual_discount_rate),
    };
  }

  async function saveScenarios(forms: ScenarioForm[], compare = false, ids?: string[]) {
    const res = await fetch(`/api/occupancynpv/workspaces/${params.id}/scenarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarios: forms.map(toInput),
        compare,
        compareScenarioIds: ids,
      }),
    });
    const json = await res.json() as Record<string, unknown> & { ok?: boolean; reason?: string };
    if (!json.ok) {
      setDialogOpen(false);
      setMessage(json.reason === "TWO_SCENARIOS_REQUIRED"
        ? "Select two saved scenarios before comparing."
        : json.reason === "SCENARIO_REQUIRED"
          ? "Add a scenario before saving."
          : "Check the lease inputs. Overlapping or missing rent months are not accepted.");
      return null;
    }
    applyPayload(json);
    setMessage("");
    return json;
  }

  async function saveCurrent(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    await saveScenarios([editing], false);
  }

  async function compare(event: React.FormEvent) {
    event.preventDefault();
    const first = scenarios.find((row) => row.scenario_id === compareA);
    const second = scenarios.find((row) => row.scenario_id === compareB);
    if (!first || !second || first.scenario_id === second.scenario_id) {
      setMessage(scenarios.length < 2 ? "Add another scenario to compare." : "Choose two different scenarios to compare.");
      return;
    }
    const json = await saveScenarios([first, second], true, [first.scenario_id, second.scenario_id]);
    if (json) setDialogOpen(true);
  }

  function addScenario() {
    const next = empty(`lease_${scenarios.length + 1}`, defaultName(scenarios.length));
    setScenarios((rows) => [...rows, next]);
    setEditingId(next.scenario_id);
    if (!compareA) setCompareA(next.scenario_id);
    else if (!compareB) setCompareB(next.scenario_id);
  }

  const view = viewFromPayload(result);

  return (
    <main className="onpv-page onpv-page--workspace">
      <p><a className="onpv-link" href="/occupancynpv/app">Back to dashboard</a></p>
      <header className="onpv-workspace-header">
        <p className="onpv-kicker">Workspace</p>
        <h1 className="mt-2">{workspaceName}</h1>
        <p className="onpv-lede">NPV uses end-of-month cash flows and converts the annual discount rate to a monthly effective rate. Free rent waives base rent only. Ranking uses NPV, not a subjective “better” label. Save scenarios in this DealWorkspace, then Compare NPV. OccupancyNPV is not a CRM. Results depend on the inputs you entered and are not legal or investment advice. Next: edit inputs, compare another pair, or return to the dashboard to rename or archive.</p>
      </header>

      <section className="onpv-card onpv-scenario-collection" data-scenario-list="true">
        <div className="onpv-section-head">
          <h2>Scenarios</h2>
          <p className="onpv-muted">{scenarios.length} saved</p>
        </div>
        {scenarios.length === 0 ? (
          <div className="onpv-empty" data-empty-state="true">
            <p>No scenarios yet. Add a first scenario to start modeling this deal.</p>
            <button className="onpv-btn-primary" type="button" onClick={addScenario}>Add First Scenario</button>
          </div>
        ) : (
          <>
            <ul className="onpv-scenario-grid" data-selected-item={editingId ?? ""}>
              {scenarios.map((row) => {
                const active = editingId === row.scenario_id;
                return (
                  <li
                    key={row.scenario_id}
                    className={`onpv-scenario-item${active ? " onpv-scenario-item--active" : ""}`}
                    data-scenario-item="true"
                    data-active={active ? "true" : "false"}
                    data-selected-item={active ? row.scenario_id : undefined}
                    aria-current={active ? "true" : undefined}
                  >
                    <div>
                      <div className="onpv-scenario-item-head">
                        <h3>{row.scenario_name}</h3>
                        {active ? <span className="onpv-badge onpv-badge--editing" data-selected-badge="true">Editing</span> : null}
                      </div>
                      <p className="onpv-muted">
                        {row.term_months} months · ${row.monthly_rent.toLocaleString()} / month
                        {formatDate(row.created_at) ? ` · Added ${formatDate(row.created_at)}` : ""}
                      </p>
                    </div>
                    <button
                      className="onpv-btn-secondary"
                      type="button"
                      aria-pressed={active}
                      onClick={() => setEditingId(row.scenario_id)}
                    >
                      Open / Edit
                    </button>
                  </li>
                );
              })}
            </ul>
            {scenarios.length === 1 ? <p className="onpv-muted">Add another scenario to compare NPV.</p> : null}
            {scenarios.length > 2 ? <p className="onpv-muted">This workspace has more than two scenarios. Choose any two below to compare.</p> : null}
            <button className="onpv-btn-secondary" type="button" onClick={addScenario}>{scenarios.length === 1 ? "Add Another Scenario" : "Add Scenario"}</button>
          </>
        )}
      </section>

      {editing ? (
        <form ref={formRef} className="onpv-card onpv-scenario-form mt-6" data-editor-item={editing.scenario_id} onSubmit={saveCurrent}>
          <h2>Edit {editing.scenario_name}</h2>
          <div className="onpv-grid onpv-grid--2">
            <label className="block text-sm">Name<input value={editing.scenario_name} onChange={(e) => updateEditing({ ...editing, scenario_name: e.target.value })} /></label>
            <label className="block text-sm">Term (months)<input type="number" min={1} value={editing.term_months} onChange={(e) => updateEditing({ ...editing, term_months: Number(e.target.value) })} /></label>
            <label className="block text-sm">Monthly rent<input type="number" min={0} value={editing.monthly_rent} onChange={(e) => updateEditing({ ...editing, monthly_rent: Number(e.target.value) })} /></label>
            <label className="block text-sm">Step starts month<input type="number" min={1} value={editing.step_start} onChange={(e) => updateEditing({ ...editing, step_start: Number(e.target.value) })} /></label>
            <label className="block text-sm">Stepped monthly rent<input type="number" min={0} value={editing.step_rent} onChange={(e) => updateEditing({ ...editing, step_rent: Number(e.target.value) })} /></label>
            <label className="block text-sm">Free-rent months at start<input type="number" min={0} value={editing.free_rent_months} onChange={(e) => updateEditing({ ...editing, free_rent_months: Number(e.target.value) })} /></label>
            <label className="block text-sm">Monthly operating expenses<input type="number" min={0} value={editing.monthly_operating_expenses} onChange={(e) => updateEditing({ ...editing, monthly_operating_expenses: Number(e.target.value) })} /></label>
            <label className="block text-sm">One-time cost (month 1)<input type="number" min={0} value={editing.one_time_cost} onChange={(e) => updateEditing({ ...editing, one_time_cost: Number(e.target.value) })} /></label>
            <label className="block text-sm">Allowance offset (month 1)<input type="number" min={0} value={editing.allowance} onChange={(e) => updateEditing({ ...editing, allowance: Number(e.target.value) })} /></label>
            <label className="block text-sm">Annual discount rate<input type="number" step="0.01" min={0} value={editing.annual_discount_rate} onChange={(e) => updateEditing({ ...editing, annual_discount_rate: Number(e.target.value) })} /></label>
          </div>
          <button className="onpv-btn-secondary mt-4" type="submit">Save Scenario</button>
        </form>
      ) : null}

      <form className="onpv-card onpv-compare-panel mt-6" onSubmit={compare} data-compare-select="true">
        <h2>Compare NPV</h2>
        {scenarios.length < 2 ? (
          <p className="onpv-muted">Comparison needs two scenarios. Add another scenario to continue.</p>
        ) : (
          <>
            <div className="onpv-grid onpv-grid--2">
              <label>Scenario A
                <select value={compareA} onChange={(e) => setCompareA(e.target.value)}>
                  {scenarios.map((row) => <option key={`a-${row.scenario_id}`} value={row.scenario_id}>{row.scenario_name}</option>)}
                </select>
              </label>
              <label>Scenario B
                <select value={compareB} onChange={(e) => setCompareB(e.target.value)}>
                  {scenarios.map((row) => <option key={`b-${row.scenario_id}`} value={row.scenario_id}>{row.scenario_name}</option>)}
                </select>
              </label>
            </div>
            <div className="onpv-compare-actions">
              <button
                ref={compareButtonRef}
                className="onpv-btn-primary"
                type="submit"
                data-app-action="compare-npv"
                data-semantic-role="PRIMARY_EXECUTION"
              >
                Compare NPV
              </button>
            </div>
          </>
        )}
        {view && !dialogOpen ? (
          <div className="onpv-result-continuation" data-result-continuation="true" data-workflow-result="comparison">
            <p className="onpv-kicker">Latest result</p>
            <p>A comparison is ready. Open it to review NPV ranking, occupancy cost, and sensitivity.</p>
            <button
              className="onpv-btn-continuation"
              type="button"
              data-app-action="view-latest-comparison"
              data-semantic-role="PRIMARY_CONTINUATION"
              onClick={() => setDialogOpen(true)}
            >
              View Latest Comparison
            </button>
          </div>
        ) : !view ? (
          <p className="onpv-muted" data-result-empty="true">Compare two scenarios to generate a result you can reopen here.</p>
        ) : null}
      </form>
      {message ? <p className="onpv-error mt-3" role="alert">{message}</p> : null}
      <ComparisonResultDialog
        open={dialogOpen}
        result={view}
        onClose={() => setDialogOpen(false)}
        onCompareAnother={() => { setDialogOpen(false); compareButtonRef.current?.focus(); }}
        onEditInputs={() => { setDialogOpen(false); formRef.current?.querySelector<HTMLInputElement>("input")?.focus(); }}
      />
      <section className="onpv-card onpv-help mt-8" id="onpv-help" data-support="true">
        <h2>Help and support</h2>
        <p>Need help with a comparison? Email <a href="mailto:infinitemediaresources@gmail.com">infinitemediaresources@gmail.com</a>.</p>
        <p className="onpv-muted"><OccupancynpvImprovementChrome workflow="calculator/input workflow" /></p>
      </section>
    </main>
  );
}
