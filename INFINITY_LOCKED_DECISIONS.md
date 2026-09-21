# Infinity — Locked Architectural Decisions

**Canonical invariants**  
**Checkpoint:** August 15, 2026

These decisions should not be casually reversed in future chats or implementation sessions. If a change is proposed, explicitly explain why the new evidence justifies changing the invariant and update this file.

## 1. Autonomy
1. Infinity is autonomous by default.
2. Do not reintroduce a global human-approval queue for normal allowlisted/within-policy execution.
3. Specific artifacts/actions may be blocked by policy, missing verified evidence, permissions, credentials, risk, or configured requirements without blocking the rest of Infinity.
4. HITL is an enrichment/verification capability, not the operating model for the whole system.

## 2. Monetization
5. Monetization Engine belongs early in the pipeline.
6. Do not wait until after a venture is built to decide how it makes money.
7. Revenue mechanism, unit economics, expected profit, acquisition cost, operating cost, and payback should influence whether and how a venture is built.

## 3. AI Architecture
8. AI providers remain provider-neutral behind routing abstractions.
9. Do not permanently encode `task X = provider Y` unless a temporary capability constraint requires it.
10. OpenAI, Gemini, Anthropic, and xAI may collaborate on difficult work when value justifies complexity/cost.
11. Independent review should use a genuinely independent provider when feasible and valuable.
12. Routing should consider capability, quality, reliability, cost, latency, context requirements, and task risk.

## 4. Product + Asset Building
13. Real AI coding output must be validated before workspace mutation.
14. Workspace mutation requires path safety, snapshots/rollback strategy, traceability, and quality gates.
15. Generation success does not equal production readiness.
16. FeatureContracts and build gates remain central to proving artifact completeness.

## 5. Organic Growth / SEO / GEO
17. Do not hard-code IMR logic as niche-specific rules; encode the reusable decision logic behind it.
18. Keywords are evidence/demand signals, not automatic pages.
19. Digital real estate means economically justified ownership of useful organic assets, not arbitrary URL count.
20. **Scale quality, not URL count.**
21. A 1,000-page candidate universe may correctly result in only 100–200 approved pages if those are the only ones that deserve to exist now.
22. Every indexable page must provide standalone value.
23. Thin, keyword-swapped, entity-swapped, city-swapped, or neighborhood-swapped pages fail.
24. Content depth follows information need, not arbitrary word count.
25. Strategic authority pages should be built to become credible resources worth retrieving/linking/citing, not merely to contain keywords.
26. Use TopicCoverageMap, InformationGainPlan, evidence/claim lineage, completeness, citation-worthiness, and cannibalization controls.
27. Direct-answer structure is valuable for suitable questions, but answer-first must be followed by sufficient depth when the intent requires it.
28. Do not invent internal links. Internal-link targets must exist in the canonical registry as published, approved planned, or generated in the current build.
29. URL structure is semantic and dynamic. Do not universally hard-code folders such as `/questions/`, `/answers/`, `/blog/`, `/airport/`, `/city/`, or `/service-area/`.
30. Schema must describe what genuinely exists on the page/entity. Do not use one fixed schema stack everywhere.
31. Never fabricate reviews, ratings, prices, availability, addresses, locations, authors, offers, credentials, or schema facts.
32. Stable entity identities / `@id` relationships should be maintained across a site.

## 6. City and Neighborhood Architecture
33. City pages may become local authority hubs when justified.
34. Neighborhood pages are optional expansion spokes, not automatic permutations.
35. Neighborhood expansion requires local intent, evidence, information gain, differentiation, and economics.
36. Every approved neighborhood page requires meaningful neighborhood-specific value; otherwise merge into the city page, use a supporting section, defer, or reject.
37. Do not fragment strong city authority across dozens of weak neighborhood URLs.
38. LocalBusiness schema is never implied merely because a page targets a neighborhood/service area.

## 7. E-E-A-T / HITL
39. AI must never fabricate first-person business experience.
40. AI must never fabricate experts, reviewers, authors, credentials, case studies, field observations, customer experiences, or first-party data.
41. Human contributions should preserve provenance and supported claims.
42. HITL classifications may include NOT_NEEDED, OPTIONAL_ENRICHMENT, RECOMMENDED, and REQUIRED_FOR_PUBLICATION.
43. REQUIRED_FOR_PUBLICATION applies only to the affected artifact; it must not globally halt Infinity.
44. E-E-A-T is a quality/trust framework, not a fake single Google ranking score.

## 8. Creative Media
45. Images and videos require an architecture/decision layer analogous to organic growth; do not blindly generate media because a model is available.
46. Build a provider-neutral Creative Media Architecture Engine.
47. Do not encode `video = Veo` or `image = Gemini/OpenAI` as an architectural invariant.
48. Models are routed by media requirements, quality, cost, speed, and capability.
49. Google/Veo can be integrated through the Google/Gemini API ecosystem while remaining behind Infinity's media router.
50. Long-form YouTube content should generally be planned as research → script → storyboard → shot list → generated/first-party assets → assembly → audio/captions → thumbnail → quality review → publishing, rather than assuming a single video-generation call creates the finished product.
51. Media generation is economically gated.
52. High-value media may justify premium generation; large low-value asset sets may require cheaper models or no generated asset.
53. No AI slop at scale. Media must add useful information, persuasion, demonstration, entertainment, or brand value.
54. Generated media should be checked for relevance, coherence, factual/visual accuracy, brand consistency, legibility, hook quality, title/thumbnail truthfulness, pacing, audio quality, and task-specific risks.
55. Media should preserve generation provenance and cost telemetry.

## 9. Growth and Learning
56. Launch is not the terminal state.
57. Infinity should eventually measure actual traffic, engagement, conversions, revenue, citations, rankings, CTR, retention, watch time, and other relevant outcomes.
58. Performance data should drive expand / refresh / repair / rewrite / relink / prune / pivot / pause / shutdown decisions.
59. First-party operating data can become future information gain when privacy-safe and truthful.

## 10. Development Discipline
60. Do not rebuild verified systems merely because a new chat lacks context.
61. Check `INFINITY_BUILD_STATE.md` before choosing the next milestone.
62. Distinguish VERIFIED from DESIGNED/PLANNED.
63. Update the canonical project documents after major verified milestones or architectural changes.
64. Maintain traceability from opportunity → decision → build → provider call → mutation/asset → quality gate → production artifact → external action → performance.

## 11. Treasury + Capital
65. Infinity models may propose financial actions. Infinity Core authorizes them. No agent, mission, venture, commercialization adapter, creative-media provider, coding agent, or PAB may mutate money except through FinancialActionRequest → Treasury policy → FinancialAuthorization → External Action Gateway → FinancialProvider.
66. Connected financial providers are authoritative for actual balances/transactions/cards/payments. Infinity is authoritative for budgets, allocations, reservations, commitments, policy, and authorization.
67. Cached balances must never override a fresh provider read. Missing amounts stay UNKNOWN — never defaulted to zero.
68. Unknown, unbounded, or materially uncertain external cost cannot AUTO_AUTHORIZE.
69. FINANCIAL_AUTONOMY_ENABLED defaults to false. EMERGENCY_FINANCIAL_FREEZE supersedes mission, venture, policy auto-auth, commercialization, creative media, and coding-agent spend.
70. Reserved capital (pending execution) is distinct from committed capital (known future obligation).
71. Founder/investor capital is CAPITAL_CONTRIBUTION, not revenue. Actual profit is calculated only when actual revenue and actual attributable expenses are both known.
72. Commercialization SpendIntent is a specialized adapter into Treasury. Do not maintain a second contradictory money-governance system.

## 12. Founder Idea Lab
73. Founder ideas use the canonical pipeline: Opportunity Candidate → Research → Monetization → Venture Selection → Validation → Company Builder → PAB / Coding Router → Commercialization → Treasury → Performance Intelligence. Do not create a parallel founder-only venture architecture.
74. Founder override does not erase Infinity's original recommendation. Both Infinity decision and founder decision remain persisted; origin becomes FOUNDER_OVERRIDE when they differ.
75. Founder build approval never bypasses Treasury or the External Action Gateway. Founder BUILD is not unlimited spending authority.
76. Founder-origin ventures remain distinguishable in performance data (AUTONOMOUS_DISCOVERY vs FOUNDER_SUBMITTED vs FOUNDER_OVERRIDE). Do not train naively from override outcomes.

## 13. Coding Agents
77. Coding is provider-neutral: CodingTask → Coding Router → CodingAgentProvider → Native Coder / Cursor / future provider. Do not hard-code task = Cursor.
78. Infinity Native Coder remains a core capability. No critical build path may depend permanently on Cursor.
79. Cursor cannot bypass Treasury, External Action Gateway, workspace security, or deterministic QA. Cursor success is not Infinity acceptance.
80. Cursor must not deploy production, mutate DNS, purchase services, modify secrets, or receive bank/payment credentials. Forbidden path/command attempts fail closed.

## 14. Zero-to-Production
81. Founder and autonomous ventures share one ZTP orchestration path.
82. ZTP orchestrates canonical systems; it does not replace them.
83. ZTP cannot bypass Research, Monetization, Selection, Company Builder, QA, Treasury, or the External Action Gateway.
84. Founder BUILD authority is not financial or public-launch authority.
85. Coding Router alone chooses Native/Cursor/Multi-Agent. Cursor is optional.
86. ProductionArtifact requires Infinity acceptance, not coding-provider success.
87. CommercializationPlan does not equal external commercialization.
88. READY does not equal PUBLICLY_LAUNCHED.
89. ZTP does not depend on FAVC1. FAVC1 or future autonomous cycles may invoke ZTP.
90. ZTP is resumable and idempotent.
91. Technical failure is distinct from business rejection.
92. Actual revenue/performance cannot exist before real launch/customer events.

## 15. Live Commercial Provider Verification
93. Live provider verification precedes real commercialization mutation.
94. Read-only provider verification does not authorize writes.
95. Every real external mutation remains EAG-governed.
96. Cost-bearing actions remain Treasury-governed.
97. Unknown provider costs are never zero.
98. Provider credentials remain server-only and never enter coding-agent workspaces.
99. Provider capability readiness and launch authority are separate states.
100. Missing optional provider credentials produce NOT_CONFIGURED, not technical failure.
101. Read-only verification must expire and remain freshness-aware.
102. A provider adapter cannot claim verified from mocks alone.
103. HQ reads persisted provider verification state. HQ does not execute live provider probes.

## 16. Live Deployment Provider Enablement
104. A provider capability becomes `LIVE_WRITE_VERIFIED` only after a real governed provider mutation succeeds and its result is durably recorded and verified.
105. Verification is capability-scoped. `LIVE_WRITE_VERIFIED` applies only to the actions that actually succeeded.
106. A successful hosting deploy does not grant authority for DNS, domains, payments, repository writes, migrations, or public launch.
107. Read-only verification still never implies write authority for other actions.
108. Vercel `LIVE_WRITE_VERIFIED` is limited to `hosting.create_project`, `hosting.deploy`, and `hosting.verify_deployment` until those other capabilities are independently proven.
109. Public launch remains unauthorized unless a separate public-launch authority grant exists. Provider deployment capability is not autonomous public commercialization.
110. Unknown provider deployment cost remains UNKNOWN. An authorized ceiling is not spend. Do not record unknown Vercel cost as $0 spent or as $1 spent.

## 17. Public Authority & Digital Real Estate
111. All authority-led public ventures inherit the Infinity Public Authority & Digital Real Estate Standard. Venture-specific builds may extend or specialize the standard but may not silently weaken human readability, semantic topic architecture, search-backed question coverage, GEO answer surfaces, contextual internal linking, authoritative sourcing, conversion paths, visual quality, or rendered quality-control requirements.
112. Each core authority topic must be backed by at least 20 validated real-world search questions before Infinity may classify the topic as coverage-complete. This is a coverage rule, not a requirement to create 20 standalone URLs.
112a. Validated question relationships and visible standalone authority coverage are different metrics.
112b. Mature high-demand topic families should generally expose at least 10 distinct standalone authority-question surfaces when evidence and depth justify them.
112c. The >=10 target must never create thin or cannibalizing pages.
112d. Search evidence, not an arbitrary page quota, determines final authority depth.
112e. Long-form authority surfaces use semantic section backgrounds to create visual rhythm without mechanical striping.
113. Page templates are archetypes, not fixed layouts. Global standards define required outcomes; the venture profile and page archetype determine how those outcomes are expressed.
114. Founder physical browser evidence outranks automated visual-quality claims when they conflict.
117. Canonical public footer attribution, in this visible order, is: Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR. The venture label is exactly "An Infinity OS Venture".
118. SemanticContentRedundancyGate, SemanticNavigationQualityGate, and EditorialHighlightQualityGate are global hard publishability gates. Legal and contact archetypes do not require semantic navigation or editorial highlights.
115. Search volume, ranking difficulty, traffic, CPC, and trend values are never fabricated. Unknown is not zero.
116. Authority-led Factory generation must research, cluster, and decide content before scaling pages. Direct worker bypass of that flow fails closed.

## 18. Durable Commercial Provider Mutation Authority
119. Routine bounded commercial provider mutations are policy-authorized, not founder-prompt-authorized. Authority is scoped by venture, provider, mutation class, economic exposure, risk, reversibility, identity, canonical plan, duplicate protection, readback, traceability, capability, evidence, and policy state. This is not blanket write, financial, or mutation authority.
120. PAYMENT_ACTIVATION is distinct from product, price, checkout, and webhook configuration. First production activation of a new venture defaults to FOUNDER_APPROVAL_REQUIRED. After explicit founder authorization, policy may persist AUTONOMOUS_WITHIN_POLICY for ongoing payment operation. Routine customer checkout, renewals, and webhook processing after activation do not require per-transaction founder approval.
121. PUBLIC_LAUNCH remains distinct from PAYMENT_ACTIVATION. Clearing one does not clear the other.
124. PAYMENT IS NOT FULFILLMENT. If a paid offer exists and FulfillmentReadinessGate is not PASS, PaymentActivation is BLOCKED and checkout session creation is BLOCKED. This fails closed.
125. Fulfillment is global Infinity infrastructure with venture-specific contracts. Core types stay provider-neutral and business-model-neutral. OccupancyNPV-specific fields do not belong on generic fulfillment types.
126. A successful payment event may trigger fulfillment. It does not by itself mean FULFILLMENT_COMPLETE. Completion requires proven contract criteria.
127. An orphaned paid customer — a verified successful paid transaction with no valid fulfillment order, entitlement, or governed recovery state inside the allowed window — is a critical commercial failure. Normal ORPHANED_PAID_CUSTOMER_COUNT is 0.
128. Every commercial venture must design fulfillment before payment activation. Payment activation may not precede FulfillmentReadinessGate PASS. Public launch remains a separate firewall.
129. Stripe email is never authorization to a protected resource. Canonical customer identity linkage is established at checkout creation.
122. Outbound Infinity spend (domains, provider plans, ads, vendor purchases, refunds above policy, transfers) remains Treasury + EAG. Customer payment acceptance is not Infinity spending money.
123. HQ reports mutation authority state. HQ is not the decision engine.

## 19. Venture Backend Architecture
130. EVERY VENTURE MUST HAVE A BACKEND ARCHITECTURE APPROPRIATE TO ITS PRODUCT AND FULFILLMENT MODEL.
131. FRONTEND-ONLY IS NOT A VALID PRODUCTION STATE WHEN DURABLE BUSINESS OR CUSTOMER STATE IS REQUIRED.
132. BACKEND PROVIDERS REMAIN CAPABILITY- AND ECONOMICS-DRIVEN. Do not hard-code vendor = task. Supabase is one OccupancyNPV binding, not a global requirement.
133. A VentureBackendContract is generated automatically for every newly selected venture. Required capabilities are REQUIRED, NOT_REQUIRED, or DEFERRED_WITH_JUSTIFICATION. Silent omission is not allowed.
134. VentureBackendReadinessGate FAIL blocks PRODUCT_PRODUCTION_VERIFIED, FULFILLMENT_READY, PAYMENT_ACTIVATION, and PUBLIC_LAUNCH_READY when required backend state cannot be created, read, reconciled, or recovered.
135. ProductProductionVerification requires FrontendReadiness AND BackendReadiness where those layers are required.

## 20. Returning Customer Access
136. CUSTOMER ACQUISITION AND CUSTOMER ACCESS ARE DIFFERENT FLOWS.
137. EVERY AUTHENTICATED CUSTOMER PRODUCT MUST PROVIDE A DIRECT RETURNING-USER LOGIN PATH SEPARATE FROM PRICING AND CHECKOUT.
138. Login / Sign In must appear in global public navigation on desktop and mobile. It must not be buried inside Pricing, FAQ, Pilot Access, or checkout success.

## 21. Customer-Facing Product Results
139. FUNCTIONAL CALCULATION OUTPUT IS NOT ENOUGH.
140. CUSTOMER-FACING RESULTS MUST BE INTERPRETABLE, STRUCTURED, AND ACTIONABLE.
141. RESULT WORKFLOWS MUST NOT DEAD-END.
142. RAW COMPUTATION OUTPUT MUST NOT BE TREATED AS FINISHED PRODUCT UX.
143. RenderedProductResultQualityGate applies to computed/generated product result surfaces. A result must identify the primary outcome, label metrics, provide next actions, and must not resemble a debug dump.

## 22. Persistent Customer Collections
144. PERSISTENCE REQUIRES LIFECYCLE MANAGEMENT.
145. CUSTOMER-OWNED COLLECTIONS MUST SCALE BEYOND DEMO-SIZED DATA.
146. THE MOST RECENT CHILD RECORD MUST NOT HIDE EARLIER DURABLE CUSTOMER WORK.
147. LONG-TERM PRODUCT USABILITY IS PART OF PRODUCTION QC.
148. PersistentProductCollectionContract, ProductCollectionScalabilityGate, ProductCollectionLifecycleGate, and ProductSubItemDiscoverabilityGate apply when a product persists multiple customer-owned items. A collection that renders every row on one page, lacks archive/restore, or hides earlier child records fails production validation. Archiving or deleting a consumed allocation must not restore a commercial entitlement.

## 23. Selected Item State
149. DISCOVERABLE DOES NOT MEAN STATE-CLEAR.
150. WHEN A USER IS EDITING OR ACTING ON ONE ITEM FROM A COLLECTION, THE ACTIVE ITEM MUST BE VISUALLY AND SEMANTICALLY UNAMBIGUOUS.
151. SELECTION STATE MUST NOT RELY ON COLOR ALONE.
152. RenderedSelectedItemStateQualityGate applies to selectable product collections. The selected item must be visually distinct, labeled independently of color, accessible, and synchronized with the active editor or detail surface.

## 24. Post-Launch Venture Operations
153. LAUNCH IS THE START OF VENTURE OPERATIONS, NOT THE END OF THE BUILD.
154. NO_ACTION_REQUIRED and INSUFFICIENT_POST_LAUNCH_EVIDENCE are valid successful autonomous decisions. Zero post-launch observations are not evidence of business failure.
155. DailyVentureOperatingCycle is an orchestrator, not a second Decision Engine. Recurring invocation is the Infinity Vercel cron host (`/api/runtime/tick` and `/api/runtime/venture-operating-cycle`), not a founder or Cursor prompt.

## 25. Multi-Venture Factory Generalization
156. OccupancyNPV is one completed venture path, not the factory default. A second venture must be selected from Opportunity Scanner / Monetization / Venture Selection evidence, not invented because a prompt needs a second name.
157. SecondVentureDifferentiationGate rejects CRE lease-NPV clones and lightly re-skinned analysis calculators even when implementation is easy.
158. Material difference does not override economics. Unknown CAC/LTV/ROI stays UNKNOWN. Canonical classifyDecision remains the decision engine.
159. Building a second venture must not suspend OccupancyNPV. MissionConcurrencyGate applies. HQ projects every VentureOperationalRecord automatically.
160. READY is not PUBLICLY_LAUNCHED. OccupancyNPV launch authority does not authorize a second public launch, domain purchase, or payment activation.
161. DOMAIN PURCHASE AUTHORITY, PAYMENT ACTIVATION AUTHORITY, and PUBLIC LAUNCH AUTHORITY are separate governed transitions. They must not be bundled into one founder authorization.
162. AskReview production persistence is Supabase Auth plus askreview_* tables. The Infinity JSON file store is VALIDATION_ONLY and must not be treated as production-grade because it exists. Provider neutrality may converge infrastructure when that is economically and technically correct.
163. $29/month remains a Monetization Engine hypothesis until willingness-to-pay evidence exists. Do not create Stripe products to invent a canonical price.

## 26. Global Payment Path Assurance
164. PAYMENT CONFIGURATION IS NOT PAYMENT READINESS. Products, prices, webhooks, and key presence do not prove a paid offer can collect money.
165. LIVE PAYMENT EXECUTION CAPABILITY MUST BE VERIFIED BEFORE ACTIVATION AND LAUNCH. A paid offer may not activate unless the exact production payment flow can reach the provider using current production credentials, offer bindings, modes, return URLs, and fulfillment mapping. Missing provider permissions fail closed. Infinity must not widen credentials to unrestricted keys to clear a permission failure.
166. A PUBLICLY LAUNCHED PAID VENTURE MUST CONTINUOUSLY VERIFY ITS LIVE MONEY PATH. DailyVentureOperatingCycle and relevant config/deploy changes re-run safe unpaid verification. Failure is a HIGH_PRIORITY_COMMERCIAL_INCIDENT and overrides WAITING_FOR_EVIDENCE. Do not silently rewrite a historical public-launch event.
167. FOUNDER PHYSICAL CHECKOUT TESTING IS NOT A SUBSTITUTE FOR AUTOMATED PAYMENT QC. Founder OccupancyNPV checkout review is recorded PASS and closes the current incident. Future detection of this class of defect must be automated.
168. Payment-path QC is provider-neutral factory infrastructure. OccupancyNPV is one Stripe Checkout adapter, not the global payment architecture. AskReview payment is not advanced by this decision.

## 27. Global Venture Economics + Build Health
169. EVERY CANONICAL VENTURE MUST HAVE COMPETITOR RESEARCH AND ECONOMIC INTELLIGENCE.
170. EMPTY ECONOMICS IS A NO-GO. No canonical venture may enter build or commercialization with an empty economic model.
171. UNKNOWN REQUIRES COMPLETED RESEARCH WITH INSUFFICIENT EVIDENCE. UNKNOWN must not mean the system never researched it. UNKNOWN cost is not zero. UNKNOWN CAC is not zero. UNKNOWN retention is not infinite LTV.
172. PROFIT LAB MUST SHOW REQUIRED ECONOMIC WORK OR THE REASON IT IS BLOCKED. Missing required intelligence must not silently appear idle or blank.
173. PROJECT-WIDE TYPESCRIPT DEBT IS NOT A PERMANENT ACCEPTABLE STATE AFTER RECOVERY. Future TypeScript or production-build failures are regressions unless isolated to generated/external tooling with evidence.

## 28. Execution Context + Run State Integrity + HQ Infinity Symbol Visibility
174. ENVIRONMENT ASSUMPTION IS NOT EXECUTION READINESS. No git, test, build, database, provider, or deployment evidence is trusted until `RepositoryRootVerificationGate` and `ExecutionContextReadinessGate` pass for `C:\Users\Antivist\Desktop\Infinity\infinity-core`. A successful command from the wrong directory is not valid QC evidence. Evidence gathered before verification is `INVALID_EVIDENCE`.
175. FAILED ATTEMPTS ARE HISTORY. UNRESOLVED FAILURES ARE CURRENT STATE. A repaired failure that is successfully rerun on the same or newer artifact becomes SUPERSEDED history. Current milestone health follows the latest valid relevant verification. An older PASS must not hide a newer FAIL. Do not erase historical failures.
176. VALIDATE + incomplete economics remains VALIDATE with `ECONOMICS_RESEARCH_REQUIRED_BEFORE_BUILD`. It must not become `ECONOMICS_BLOCKED`. BUILD requested with incomplete required economics is `ECONOMICS_BLOCKED` / `BUILD_BLOCKED_BY_ECONOMICS`.
177. HQ Infinity symbol internal rotating lines use `--hq-infinity-inner-active` neon purple. Do not restore yellow `#fbbf24` on `.hq-infinity-energy`. Worker state colors stay unchanged. STANDBY must remain visible without implying execution. CSS token existence does not prove rendered visibility.

## 29. HQ Venture Selection + Profit Lab Presentation + Global Growth
178. A VENTURE CLICK IS AUTHORITATIVE. THE CLICKED VENTURE MUST BE THE FIRST RENDERED INSPECTION VENTURE.
179. THE DROPDOWN MUST MIRROR THE CURRENT ROUTE; IT MUST NEVER BE REQUIRED TO COMPLETE A PRIOR CLICK.
180. EXPLICIT VENTURE SELECTION ALWAYS OVERRIDES DEFAULT/FALLBACK/CACHE STATE. ROUTE + SELECTOR + RENDERED VENTURE MUST ALWAYS AGREE. Clear Inspection returns to global/no-specific inspection and must not invent AskReview.
180a. A VENTURE-SPECIFIC CACHE MUST BE KEYED BY CANONICAL VENTURE ID. An AskReview snapshot is not eligible to restore into OccupancyNPV inspection.
180b. IF SELECTION RESOLUTION FAILS, SHOW AN ERROR — DO NOT FALL BACK TO ANOTHER VENTURE. Founder-facing code is `VENTURE_SELECTION_RESOLUTION_FAILED`.
181. LONG ECONOMICS EXPLANATIONS MUST NOT BE FORCED INTO COMPACT STATUS-BADGE GEOMETRY. Status badges stay compact. Economic values use roomier cards. Explanations use body blocks.
182. MARKETING MUST ACTIVELY GENERATE EVIDENCE. WAITING_FOR_EVIDENCE is valid only after appropriate evidence-generating actions have run or a real external dependency exists.
183. FIVE CONTACTS IS NOT A NORMAL VALIDATION SAMPLE.
184. 10 QUALIFIED NEW PROSPECTS PER BUSINESS DAY FOR APPROXIMATELY 20 BUSINESS DAYS IS A REASONABLE ADAPTIVE STARTING VALIDATION PLAN.
185. MINIMUM QUALIFIED CONVERSATIONS != TOTAL CONTACT COUNT.
186. SEND TIMING MUST USE RECIPIENT LOCAL TIME AND BE OPTIMIZED FROM PERFORMANCE. Morning 08:30–10:30 and afternoon 13:00–15:00 are hypotheses, not hard-coded universal best times.
187. ROUTINE RESPONSES SHOULD USE VARIABLE CONTEXT-AWARE PACING.
188. URGENT ISSUES MUST NOT BE ARTIFICIALLY DELAYED.
189. NORMAL FIRST CONTACT MAY SIMPLY IDENTIFY THE SENDER AS “INFINITY.”
190. IF DIRECTLY ASKED ABOUT AUTOMATION OR IDENTITY, INFINITY MUST ANSWER TRUTHFULLY.
191. INFINITY MUST NEVER IMPERSONATE A HUMAN.
192. FREE TRIALS ARE A GLOBAL CAPABILITY, NOT A UNIVERSAL REQUIREMENT.
193. AUTO-CONVERTING TRIALS REQUIRE CLEAR CUSTOMER AUTHORIZATION AND BILLING DISCLOSURE. Cancellation before billing must prevent conversion. Do not send real outreach, enable OccupancyNPV trials, change OccupancyNPV prices, or advance AskReview production from architecture work.

## 30. HQ Circular / Orbital Output Language
194. VENTURE RADAR PRIMARY OPPORTUNITY NODES USE CIRCULAR / ORBITAL PRESENTATION.
195. THE OPPORTUNITY UNIVERSE SUMMARY MAY REMAIN A NON-CIRCULAR CONTROL/SUMMARY CARD.
196. OPPORTUNITY ORBS MUST RETAIN RANK, SCORE, TITLE, MONETIZATION STATE, AND SELECTION STATE.
197. LONG OPPORTUNITY DETAILS BELONG OUTSIDE THE ORB.
198. READABILITY REPAIRS MUST NOT ERASE DECLARED CIRCULAR VISUAL LANGUAGE. Compact status may live inside a true circle. Long explanations use an associated detail body. Do not restore DecisionToken for long growth/opportunity text.

## 31. HQ Assigned Worker Visibility + Floor Balance
199. ASSIGNED HQ WORKERS REMAIN VISIBLY PRESENT IN THEIR FIRST-CLASS ROOM EVEN WHEN NOT ACTIVELY EXECUTING.
200. ACTIVE WORKER VISUALS MUST TRACE TO CANONICAL EXECUTION STATE.
201. NO ACTIVE WORK DOES NOT MEAN NO AGENTS PRESENT.
202. WORKER ORBS ARE OPERATIONAL STATE, NOT DECORATION.
203. DESIGN CORE IS PLACED IN THE LEFT HQ FLOOR COLUMN FOR VISUAL BALANCE.
204. PROFIT LAB AND SYSTEMS ARCHITECT REMAIN UNDER CREATION LAB IN THE RIGHT COLUMN.

## 32. OccupancyNPV First Growth Experiment
205. OCCUPANCYNPV’S FIRST GROWTH EXPERIMENT IS GOVERNED OUTBOUND VALIDATION. Tactic ranking selected OUTBOUND_EMAIL over preview, trial, SEO, and inbound waiting because the product is publicly launched, checkout works, post-launch evidence is sparse, and the tenant-rep market is finite and searchable. Prices stay $290/year Professional and $149 Per-Deal. Trial/entry remains an experiment and is not enabled without FreeTrialSuitabilityGate and TrialActivationGate. AskReview remains SELECTION_UNDER_REVIEW / PRODUCTION PAUSED. Do not fabricate outreach, treat five contacts as decision-grade validation, or mark the send path ready from configuration alone.
206. WORKING-TREE ACTIVE IS NOT PRODUCTION ACTIVE. OccupancyNPV growth runtime may not be deployed from a dirty tree that includes unrelated HQ/UI work or AskReview routes. Routine outbound send authority is not inferred from `authorized_to_execute`, code existence, or Gmail write verification. A bounded prospect-source grant, per-prospect send grant, and isolated growth-runtime deploy grant are required before production outreach.
207. BOUNDED GROWTH GRANTS ARE NOT A CLEAN ARTIFACT. A founder grant to source prospects, send one-by-one, and deploy an isolated growth runtime does not authorize deploying the dirty working tree. If growth-runtime files and their dependency closure are not on the known-good baseline, return `ISOLATED_GROWTH_DEPLOYMENT_ARTIFACT_REQUIRED`. Configured public-web search is not live-verified until a real probe succeeds. Live search is not a qualified outbound prospect. Do not fabricate emails or count synthetic rows.
208. OCCUPANCYNPV GROWTH RUNTIME MUST BUILD FROM A CLOSED OVERLAY, NOT THE DIRTY TREE. Assemble from baseline `07f7b0401edcb8413e23c77cba4fdd66e5c1b308` plus a proven overlay. Do not import OccupancyNPV product UI, HQ client/visual modules, or AskReview into the growth tick. Use narrow commercial-health JSON readers, published-email checks, and in-runtime suppression. Hourly eligibility cron is not send volume. Do not deploy until IsolatedProductionArtifactContract PASSes. Do not send from artifact construction.
209. GROWTH RUNTIME MUST NOT BE DEPLOYED ONTO A CUSTOMER, ASKREVIEW, OR DISPOSABLE TEST PROJECT. Live Vercel inspection found no Infinity HQ/runtime project that owns `/api/runtime/tick`. `prj_vSCXLOYDoExYUAR8ypnYz2W1Lu7d` is occupancynpv.com. `prj_188YspuXKKVurXCf2lxnP4ywyggg` is `infinity-test-live-verification-gde`. `prj_O2rAkJ7F0DENcm2sFyhAluK7PiXg` is AskReview preview. If no verified runtime target exists, return `GROWTH_PRODUCTION_TARGET_VERIFICATION_REQUIRED` and do not create or overwrite a substitute.

## 33. Quality, Capital Efficiency, and Customer Feedback
210. QUALITY IS NOT A BUDGET VARIABLE. Budget may reduce scope, provider spend, rollout speed, or optional feature count. It must not justify weak design, poor UX, unfinished branding, inaccessible interfaces, thin information architecture, visibly low-quality products, broken responsive behavior, or generic AI-looking products.
211. SHIP SMALLER, NOT WORSE. If the full feature surface cannot be built at production quality, reduce initial scope. Do not lower quality gates.
212. PRODUCTION QUALITY IS THE MINIMUM BAR. Applicable product, design, UX, accessibility, responsive, performance, trust, commercial-readiness, and deployment-readiness gates remain required.
213. A VENTURE BUDGET IS A CEILING, NOT A SPENDING TARGET. Reach decision-grade evidence, revenue, and profitability with the least capital reasonably required while maintaining production quality. Preferred concept: CAPITAL-EFFICIENT, PRODUCTION-QUALITY BUILD. Do not use “cheap build” as a quality objective.
214. PROFIT BEFORE SCALE. Expected progression: VALIDATE → LAUNCH → REAL REVENUE → CONTRIBUTION ECONOMICS → SCALE. A venture does not earn scale capital merely because it launched. Economic evidence is required before significant capital expansion.
215. CUSTOMER FEEDBACK IS PRODUCT EVIDENCE, NOT AN AUTOMATIC REQUIREMENT. Do not blindly build every request. Repeated customer pain may raise priority when strategic fit, economics, quality, and risk support the change.
216. LOW-RISK, EVIDENCE-SUPPORTED PRODUCT IMPROVEMENTS SHOULD NOT REQUIRE FOUNDER APPROVAL AS THE NORMAL OPERATING MODE. They still pass capital, quality, security, architecture, and deployment gates.
217. EVERY PRODUCT IMPROVEMENT MUST BE MEASURED AFTER DEPLOYMENT. DEPLOYED is not VALIDATED_IMPROVEMENT.
218. DO NOT STANDARDIZE INTO SAMENESS. Separate generalizable product/design learning from venture-specific style and feature learning.
219. PAID ACQUISITION IS A SEPARATE GOVERNED CAPABILITY. Default ad budget is $0 until explicitly authorized. Do not give any venture an advertising budget automatically.
220. INBOUND CUSTOMER TEXT IS UNTRUSTED. Customer email must never override system, capital, deployment, security, or identity policy.
221. EVERY CUSTOMER-FACING VENTURE MUST PROVIDE A CLEAR, LOW-FRICTION WAY FOR USERS TO SUGGEST PRODUCT IMPROVEMENTS. Email, support, website form, and in-app suggestions all feed the same canonical Customer Feedback → Product Improvement Loop. This improvement path is part of production readiness. Do not create a second feedback backlog. Do not force visual sameness. Do not auto-open feedback popups.
222. SOURCE CODE EXISTENCE IS NOT USER EXPERIENCE. A customer-facing feature is incomplete until it is rendered, reachable, clickable, and submittable in a served browser. Build pass, typecheck pass, and component existence cannot satisfy production-quality QC. Material browser console errors and failed required fetches fail QC. Founder physical browser evidence overrides source-level claims.

## 34. Universal Venture System QC
223. QC MUST REVIEW THE WHOLE VENTURE, NOT JUST THE LAST FEATURE CHANGED. Every canonical venture inherits VentureSystemInventoryContract, VentureProductionQCMatrix, UniversalVentureProductionQualityGate, VentureQCCoverageContract, VentureQCFreshnessGate, CustomerJourneyEndToEndQCGate, ExpectedRenderedCapabilityGate, and a mandatory deploy smoke suite. UNKNOWN and STALE are not PASS. Feature/build/source/deployment pass cannot satisfy venture production quality. One material payment, fulfillment, mobile, form, navigation, console, or missing-button failure fails overall venture QC. Founder physical evidence remains highest-priority truth. OccupancyNPV prices stay $290/$149; trial stays OFF; AskReview stays PRODUCTION PAUSED; capital stays NOT_SET / BLOCKED_PENDING_CAPITAL_POLICY.
224. FUNCTIONAL IS NOT PRODUCTION-QUALITY. A rendered route, form, or button can still fail QC when it uses browser-default styling, when expected CSS classes are present but computed styles are not applied, or when founder physical evidence shows an unfinished surface. RenderedVisualQualityGate, DefaultBrowserStyleDetectionGate, RenderedStyleApplicationGate, and VentureDesignSystemConformanceGate are required. FULL QC requires 100% material inventory accounting (PASS, FAIL, or explicit N/A). New capabilities invalidate affected prior PASS evidence. Capital configuration remains blocked until this QC architecture is trustworthy.

## 35. Customer Suggestions HQ Surface
225. CUSTOMER SUGGESTIONS IS A FIRST-CLASS VENTURE HQ SURFACE. Every customer-facing venture using the canonical feedback loop inherits the same Customer Suggestions projection. HQ must not require the founder to search internal System View panels to find customer feedback.
226. REAL AND SYNTHETIC FEEDBACK MUST REMAIN VISIBLY DISTINCT. Synthetic/QC records never inflate real suggestion, repeat, opportunity, or validated counts.
227. CANONICAL FEEDBACK MAY NOT EXIST WITHOUT AN ACCESSIBLE FOUNDER-VISIBLE HQ PROJECTION. FounderFeedbackVisibilityGate remains required. HQ remains a projection of CustomerFeedbackRecord, VentureImprovementIntakeContract, ProductImprovementOpportunity, and CanonicalVentureImprovement. Do not duplicate records into an HQ-only store.

## 36. Offer + Deal Architecture
228. PRICING IS NOT THE SAME AS THE OFFER. Every commercial venture must have an evidence-based offer architecture before commercial activation. An offer is the complete customer deal structure, not only the price.
229. TRIALS, PILOTS, GUARANTEES, DISCOUNTS, FREEMIUM, FREE-FIRST-USE, FREE-FIRST-TRANSACTION, BUNDLES, REFERRAL INCENTIVES, AND SIMILAR STRUCTURES ARE TESTABLE COMMERCIAL TACTICS, NOT UNIVERSAL DEFAULTS.
230. OFFER SELECTION MUST CONSIDER conversion friction, time-to-value, buyer trust, price, margin, capital, fulfillment cost, provider cost, support burden, abuse risk, refund risk, customer evidence, competitive evidence, operational complexity, and strategic fit.
231. FREE DOES NOT MEAN ZERO COST. UNKNOWN COST IS NOT ZERO. No offer may activate if payment or fulfillment readiness is not verified. No offer experiment may bypass Treasury or capital policy.
232. AUTO-CONVERTING TRIALS REQUIRE EXPLICIT CUSTOMER AUTHORIZATION AND CLEAR trial duration, post-trial price, billing date, billing frequency, and cancellation path.
233. OFFER PERFORMANCE MUST BE MEASURED FROM REAL CUSTOMER BEHAVIOR. Customer feedback may inform offer design but may not automatically override economics, policy, or quality gates.
234. OFFER + DEAL ARCHITECTURE IS A FIRST-CLASS CANONICAL BUILD STAGE after Commercialization Economics and before Company Formation. Offer Optimization is part of the post-launch operating loop. OccupancyNPV prices stay $290/$149. OccupancyNPV trial stays OFF. Do not activate FREE_FIRST_DEAL from analysis.

## 37. Customer-Facing Page Depth
235. EVERY CUSTOMER-FACING VENTURE PAGE MUST PROVIDE SUFFICIENT DEPTH TO SATISFY THE MATERIAL USER INTENT OF THAT PAGE. A page is not production-quality merely because it renders, functions, and contains basic copy. Content depth is judged by question coverage, decision support, product understanding, objection handling, and information completeness — not by word count alone. Thin pages fail QC. Repetitive pages fail QC. Long but low-information pages fail QC. Depth must match page purpose and venture archetype. OccupancyNPV pricing is a depth-philosophy reference, not a layout template. A technically working thin page cannot receive FULL PASS.
