# Infinity — Master Architecture

**Canonical project architecture**  
**Checkpoint:** August 15, 2026

## 1. Mission
Infinity is an autonomous venture discovery, validation, creation, monetization, launch, growth, and optimization system. Its target behavior is an ongoing loop that can independently discover opportunities, decide whether they are worth pursuing, select a monetization model, build the venture and required assets, launch allowlisted/within-policy actions, measure results, and iterate.

Infinity is not a single website builder or content generator. It is a reusable company-building operating system.

## 2. Core Principles
- Autonomous by default; no global human-approval gate for allowlisted/within-policy actions.
- Provider-neutral AI architecture. Models are routed by capability, economics, reliability, and task requirements rather than hard-coded permanently to roles.
- Monetization is considered early, before expensive building begins.
- Evidence, economics, quality, policy, and deterministic gates constrain autonomy.
- High-value difficult tasks may use multiple independent AI providers when the expected benefit justifies the cost.
- Systems should be reusable across venture types rather than hard-coded to IMR, private aviation, ecommerce, or any single niche.
- Generated artifacts must pass validation and quality gates before they become production-ready.
- Scale quality, not output count.

## 3. End-to-End Target Pipeline
Opportunity Discovery / Scanner
  (including Founder Idea Lab intake → same OpportunityCandidate)
→ Research & Evidence
→ Strategy / Validation
→ Monetization Engine
→ Venture Selection
→ Company Builder
→ Acquisition Architecture
→ Organic Growth Architecture (when justified)
→ Creative Media Architecture (verified foundation)
→ Product + Asset Builder
→ Production Artifact
→ External Action Gateway / Launch
→ Treasury + Capital / Budget Engine (governs all financial mutations)
→ Marketing & Growth
→ Monitoring / Measurement (Performance Intelligence V1 verified foundation)
→ Learning / Iteration
→ Expansion, repair, prune, pivot, or shutdown

The pipeline is adaptive. Not every venture requires every subsystem.

## 4. AI Brain and Model Routing
Infinity uses a provider-neutral AI Brain and AI Model Router. Configured provider ecosystem currently includes OpenAI, Google/Gemini, Anthropic, and xAI.

The router should select providers according to capabilities such as:
- grounded/current research
- reasoning
- architecture
- coding
- structured output
- adversarial review
- database/API work
- image generation
- video generation (planned)

Provider roles must remain configurable. Historical preferences or successful routes are routing evidence, not permanent architectural bindings.

### Multi-brain strategy
For difficult or high-value work, Infinity can use different providers for architecture, implementation, review, disagreement resolution, and repair. Independent review should be genuinely independent when multiple capable providers are available. Multi-provider execution should not be used merely for ceremony; expected value must justify added cost and latency.

## 5. Opportunity Discovery and Validation
Opportunity Scanner is the beginning of the autonomous loop. It should discover opportunities without waiting for a user prompt and feed structured candidates into research, validation, monetization, and venture selection.

Validation should distinguish sourced evidence, derived conclusions, estimates, and unknowns. It should challenge demand, feasibility, competition, economics, operational burden, and downside before a venture advances.

## 6. Monetization Engine
Monetization is an early architectural requirement, not a late-stage add-on.

Before committing substantial build resources, Infinity should determine how a venture can generate revenue and whether the economics support building it. Potential mechanisms include:
- subscriptions
- ecommerce
- commissions
- affiliate revenue
- lead generation
- advertising
- digital products
- marketplaces
- services
- licensing
- other evidence-supported models

The engine should model revenue mechanism, pricing assumptions, unit economics, expected gross profit, acquisition economics, payback, operating costs, and risk. Monetization output should influence venture selection, product scope, organic strategy, media investment, and expansion.

## 7. Company Builder
Company Builder transforms an approved opportunity and monetization plan into a Venture Blueprint / BuildPackage describing what the venture actually needs. It should not independently reinvent downstream specialist architecture. For example, Organic Growth Architecture owns organic site expansion planning; Creative Media Architecture will own media planning.

## 8. Product + Asset Builder V2 / V2.1
Product + Asset Builder creates venture assets and software from structured contracts.

### V2 verified capabilities
V2 demonstrated production build intelligence, feature contracts, marketplace application capabilities, authentication/authorization, marketplace logic, subscription abstraction, analytics hooks, SEO/public discovery, moderation, quality gates, and ProductionArtifact generation.

### V2.1 core advance
V2.1 closed the critical V2 gap: real AI coding output is validated and applied to an isolated venture workspace rather than being used only for architecture/review telemetry.

Core V2.1 components include:
- CodingTask contract (13 task types)
- RepositoryContextEngine
- CodeChangeSet schema + validation
- WorkspaceMutationEngine with snapshots, path guards, apply and rollback
- AI Coder
- task decomposer
- independent review routing
- usage telemetry
- persistence
- orchestrator with build → test → review → repair loop

### Verified live V2.1 checkpoint
Primary live run: `15f50332`
- 9 CodingTasks created
- 4 primary tasks completed + 5 repair tasks
- 4 CodeChangeSets
- 8 files created
- 2 files modified
- 10 AI workspace mutations applied
- 5 repair loops
- 4 independent reviews
- 0 unresolved CRITICAL/HIGH reviewer findings
- FeatureContracts: 1 passed / 0 failed
- 69,375 input tokens
- 26,050 output tokens
- 95,425 total tokens
- reported OpenAI build AI cost: $0.347
- ProductionArtifact: READY

Live provider participation in that run:
- OpenAI `gpt-4.1-mini`: primary implementer
- Gemini `gemini-2.0-flash`: independent reviewer
- xAI `grok-3-mini`: independent reviewer for early/database/API tasks
- Anthropic configured and available but not selected for that run

Live verification passed 2/2 live + 5/5 mock tests. Migration `20260815250000_product_asset_builder_v2_1.sql` was applied successfully.

## 9. Production Artifacts and Quality Gates
A generated artifact is not production-ready merely because generation completed. Applicable gates include dependency install, typecheck, lint/build, unit/integration tests, feature-contract coverage, secret scan, placeholder detection, security review, workspace isolation, independent review, and task-specific quality validation.

Failures should trigger repair, rollback, expansion, merge, or block behavior depending on artifact type.

## 10. External Action Gateway
Infinity has an Autonomous External Action Gateway/live launch path capable of executing allowlisted/within-policy actions without a global human approval requirement. A first autonomous live launch succeeded in prior development.

The gateway should remain policy-, risk-, capability-, and allowlist-aware. The absence of a blanket approval gate does not mean unrestricted external action.

## 11. Organic Growth Architecture Engine V1 — Designed / Next Implementation Context
The Organic Growth Architecture Engine has been fully architected in project planning but is not represented here as verified implementation unless a later build-state update says otherwise.

Its purpose is to decide whether and how SEO, GEO, answer-engine optimization, topical authority, local SEO, programmatic SEO, ecommerce discovery, directories, marketplaces, and large-scale digital real estate should be used for each venture.

### Organic architecture principles
- Do not treat keyword lists as site architecture.
- Build SearchAnswerOpportunityGraph across entities, topics, questions, services, products, locations, comparisons, buyer stages, and intents.
- Determine OrganicChannelViability before generating large architectures.
- Generate PageOpportunities, then score and decide CREATE / MERGE / SUPPORTING_ONLY / DEFER / NOINDEX / REJECT.
- Analyze cannibalization and semantic overlap.
- Model page and cluster economics using Monetization Engine inputs.
- Build dynamic hub/spoke and question-led authority architecture.
- Generate semantic URL architecture rather than hard-coding folders.
- Maintain CanonicalURLRegistry; never invent internal links to nonexistent pages.
- Build semantic InternalLinkGraph and authority flow.
- Select schema dynamically from actual page type/content and verified entities.
- Maintain stable SiteEntityGraph and schema `@id` relationships.
- Generate breadcrumbs from real canonical hierarchy.
- Produce OrganicContentContracts for Product + Asset Builder.

### Digital real estate principle
Infinity must never interpret a 1,000-page model as a command to manufacture 1,000 URLs. Candidate opportunities are filtered by uniqueness, intent, information gain, evidence, completeness, citation-worthiness, cannibalization, economics, and crawl/indexing considerations.

If 1,000 candidates produce only 175 pages that currently deserve to exist, build 175.

**Scale quality, not URL count.**

### Anti-thin-content hard gate
Every indexable page must deserve to exist independently. A page cannot pass merely because a keyword, location, entity, competitor page, or programmatic combination exists.

Planned quality constructs include:
- ThinContentRiskScore
- StandalonePageValueScore
- TopicCoverageMap
- InformationGainPlan
- EvidencePlan
- ClaimGraph
- CitationWorthinessScore
- ContentCompletenessScore
- ResourceDepthClassification: DIRECT_RESPONSE / STANDARD_RESOURCE / DEEP_RESOURCE / DEFINITIVE_RESOURCE

Depth follows information need, not arbitrary word count.

### Citation-resource objective
Strategic resources should be designed to become credible sources worth retrieving, linking to, and potentially citing. Citation-worthiness considers answer clarity, factual precision, completeness, source quality, traceability, original information gain, unique analysis, first-party data when legitimate, useful calculations/tables/comparisons, entity clarity, methodology, freshness, claim verifiability, and semantic structure.

### Direct answer + deep resource
Question/answer pages should use a concise self-contained direct answer when appropriate, followed by a sufficiently deep resource covering why, how, variables, evidence, examples, implementation, comparisons, risks, tradeoffs, and relevant follow-ups.

### City → neighborhood architecture
When local acquisition is justified, Infinity may expand region → city → neighborhood/district architecture. Neighborhood pages are not automatic. They require their own NeighborhoodPageViabilityScore and NeighborhoodInformationGainPlan, plus meaningful local intent, evidence, differentiation, economics, and cannibalization protection.

A neighborhood page that only swaps a location name must fail. Weak neighborhood opportunities should become a city-page section, merge, defer, or reject.

### HITL and E-E-A-T
Infinity remains autonomous by default. Human-in-the-loop capability exists as targeted expertise/evidence enrichment, not a global approval queue.

Human contribution classes:
- NOT_NEEDED
- OPTIONAL_ENRICHMENT
- RECOMMENDED
- REQUIRED_FOR_PUBLICATION

Possible contributions include SME review, first-party experience, local expertise, case-study input, technical verification, factual review, regulated review, original data, field observations, and asset evidence.

AI must never fabricate first-person experience, fake experts, fake credentials, fake reviewers, or fake first-party evidence. Human contributions should preserve provenance and supported claims.

Only a specific artifact that truly requires verified expertise may be blocked; Infinity continues other autonomous work.

## 12. Creative Media Architecture Engine V1 — VERIFIED Foundation
Implemented in `lib/infinity/creative-media-engine/` (August 2026). This milestone is verified for provider-neutral media opportunity/economics, briefs, capability registry, routing, async jobs, asset registry, provenance, quality/repair, and production artifacts. Live verification includes OpenAI image generation; Google media adapters (Imagen/Veo) remain behind `google_media` without leaking provider assumptions into domain contracts.

Purpose: create a provider-neutral autonomous image/video/creative system analogous to the AI Brain and Organic Growth Architecture.

Target components:
1. Media Opportunity Engine — decide what media assets are worth creating.
2. Creative Brief Engine — image/video/thumbnail/storyboard contracts.
3. Media Model Router — select models/providers by capability, quality, cost, speed, and task.
4. Media Generation Engine — generate assets with provenance and cost telemetry.
5. Creative Quality + Adversarial Review — detect incoherent, misleading, low-value, brand-inconsistent, or low-quality media and repair/regenerate.
6. Media Economics + Learning — connect asset cost to CTR, retention, conversions, revenue, and downstream learning.

The architecture must not equate `video = Veo` or `image = Gemini`. Models are implementations behind a provider-neutral router.

### Google media path
Google's Gemini API ecosystem can be extended with explicit image/video capabilities, including Veo-family video generation. The Google provider adapter should support asynchronous video generation/job handling while the Media Model Router remains provider-neutral.

### Autonomous YouTube target
Future target pipeline:
Channel opportunity analysis
→ topic/recommendation opportunity
→ evidence/research
→ video brief
→ script
→ storyboard
→ shot list
→ image/video generation
→ voice/audio
→ assembly
→ captions/graphics
→ thumbnail
→ quality/adversarial review
→ repair
→ metadata package
→ publishing
→ CTR/retention/watch-time/lead/revenue monitoring
→ learning/iteration

Long-form videos should generally be assembled from controlled scenes/assets rather than assuming one generative-video call should create an entire finished video.

### Media economics
Media generation must be economically gated. Infinity should compare expected asset/video value against research, generation, voice, assembly, publishing, and maintenance costs, then choose premium model, economical model, simplified asset, defer, or reject.

### Anti-slop principle
Media scale must not create low-value AI slop. Assets should be reviewed for usefulness, factual/visual accuracy, relevance, brand consistency, coherence, text legibility, hook quality, title/thumbnail truthfulness, pacing, audio quality, and economics.

## 13. Marketing and Growth
The long-term Marketing/Growth system should orchestrate organic growth, paid acquisition, social channels, affiliates, content distribution, email/CRM where applicable, and media/channel growth according to venture economics.

Planned capabilities include autonomous social-channel creation/posting where APIs, platform policy, permissions, and risk controls permit it, including channels such as Facebook pages and YouTube.

## 14. Monitoring and Iteration — Performance Intelligence V1 Verified
Infinity's terminal state is not launch. The **Performance Intelligence & Learning Engine V1** (`lib/infinity/performance-intelligence-engine/`) establishes the closed-loop foundation: source-neutral ingestion → normalized events → deterministic metrics → venture KPI models → expected-vs-actual analysis → diagnosis → optimization opportunities → economically prioritized learning decisions → mission handoff into existing execution systems.

Initial verified sources: `InternalInfinityPerformanceAdapter` (real Infinity operational data) plus mock external web analytics adapter. Future adapters (GA4, Search Console, Stripe, YouTube, etc.) register without core redesign.

Infinity should monitor venture and asset performance and feed evidence back into strategy.

Potential decisions:
- expand
- refresh
- repair
- rewrite
- relink
- prune
- change monetization
- alter acquisition mix
- change creative
- pivot
- pause
- shut down

Organic feedback should eventually track indexation, impressions, clicks, rank, AI mentions/citations, sessions, leads, sales, revenue, conversion rate, assisted conversions, crawl activity, backlinks/citations, content completeness, and claim freshness.

Media feedback should eventually track impressions, CTR, hook retention, watch time, completion, subscriber conversion, traffic, leads, revenue, creative cost, and ROI.

## 15. Operator Observability — Live Venture Operator Console V1 Verified

Infinity HQ is the operator-facing observability layer at `/dashboard/ventures/[ventureId]`. It is **not** an autonomous reasoning engine — it visualizes persisted state from verified engines.

### Architecture
- **Server-side operator read model** (`lib/infinity/operator-console/`) aggregates truth from existing engine tables
- **Secure boundary**: browser → Next.js API route → `createAdminClient()` → sanitized snapshot JSON
- **No client-side access** to RLS-protected internal operational tables
- **Polling** (~4s) via `/api/operator-console/ventures/[ventureId]` — no direct Supabase realtime subscriptions from browser

### Infinity HQ department model
Verified engines map into business-readable departments (Opportunity Lab, Research, Strategy & Finance, Company Operations, Growth, Creative Studio, Product Lab, Quality Control, Launch Operations, Intelligence Center, Executive Office).

Both **HQ View** (spatial department floor) and **System View** (technical IDs, JSON panels) read from the same canonical snapshot.

**Primary surface:** `/dashboard` resolves the active/default venture and renders Infinity HQ immediately after login. Deep links remain at `/dashboard/ventures/[ventureId]`. Portfolio-wide mission pipeline observability lives at `/dashboard/portfolio`.

Closed-loop routing visualizes Performance Intelligence → LearningDecision → Mission → target department when persisted decision payload includes `missionTargetEngine`.

## 15. Persistence and Lineage
Infinity should preserve lineage across decisions and artifacts rather than creating disconnected outputs.

Representative lineage:
OpportunityCandidate
→ research/evidence
→ MonetizationPlan
→ VentureBlueprint
→ AcquisitionArchitecture
→ OrganicGrowthRun (if applicable)
→ OrganicGrowthBuildPackage (if applicable)
→ BuildPackage
→ FeatureContract
→ CodingTask / AssetTask
→ ProviderCall
→ CodeChangeSet / generated asset
→ WorkspaceMutation / asset registry
→ ReviewFinding
→ BuildGate
→ ProductionArtifact
→ ExternalAction
→ FinancialActionRequest / Treasury authorization
→ PerformanceEvent
→ learning/iteration decision

## 15a. Treasury + Capital / Budget Engine
Treasury is the canonical money-governance layer. Models may propose financial actions; Infinity Core decides authorization.

Required path:
Mission / Venture / SpendIntent
→ FinancialActionRequest
→ Treasury policy
→ FinancialAuthorization
→ External Action Gateway
→ FinancialProvider adapter
→ future bank/card/payment provider

Source of truth:
- Connected financial provider is authoritative for actual balances, transactions, cards, and payments.
- Infinity persistence is authoritative for budgets, allocations, reservations, commitments, policy, authorization, and economic reasoning.
- Cached balances never override a fresh provider read. Unavailable provider state is STALE / DEGRADED / UNKNOWN — never silently treated as current.

Unknown cost is never zero and never AUTO_AUTHORIZE.
FINANCIAL_AUTONOMY_ENABLED defaults to false. Emergency freeze supersedes every subsystem.
Founder/investor capital is CAPITAL_CONTRIBUTION, not revenue.
Commercialization SpendIntent is a specialized adapter into Treasury; there is one canonical policy/authorization model.

## 15b. Founder Idea Lab
Founder Idea Lab is an intake layer, not a parallel venture stack. A FounderIdeaSubmission converts into the canonical OpportunityCandidate and is graded by Opportunity Scanner scoring, Monetization, Venture Selection, and build-gate classifyDecision.

Infinity may recommend BUILD, VALIDATE, HOLD, or REJECT. The founder retains control, including BUILD ANYWAY, but founder approval is not spend authority: FinancialActionRequest → Treasury → External Action Gateway still applies.

FounderDecisionOverride stores both Infinity's original recommendation and the founder's decision. Override never rewrites Infinity's recommendation. Resulting ventures carry origin AUTONOMOUS_DISCOVERY | FOUNDER_SUBMITTED | FOUNDER_OVERRIDE through venture, mission, build, commercialization, and performance segmentation.

Approved builds route FounderIdea → OpportunityCandidate → Venture Blueprint → Company Builder → BuildPackage → Coding Router (Native Coder / optional Cursor) → QA → ProductionArtifact. There is no shortcut from the form to code generation or public deployment.

## 15c. Coding Agent Adapter
Coding work is provider-neutral. BuildPackage / CodingTask is routed by the Coding Router to a CodingAgentProvider (Infinity Native Coder, optional Cursor, future providers). Results normalize to CodeChangeSet → WorkspaceMutation → Infinity QA → ProductionArtifact.

Cursor is an optional first-class provider (CURSOR_CLI / CURSOR_CLOUD_AGENT), not Infinity's core brain and not the only coder. Native Coder remains a core capability; Cursor unavailability must not fail supported Native tasks.

Cursor cannot bypass Treasury, External Action Gateway, workspace path policy, or QA. Cursor reporting success is not Infinity acceptance. Cursor cannot deploy production, mutate DNS, purchase services, or use financial/secret credentials. Unknown Cursor cost cannot AUTO_AUTHORIZE.

## 15d. Zero-to-Production Venture Builder
Zero-to-Production is the canonical closed-loop orchestrator. Founder and autonomous ventures share one path. ZTP does not replace Research, Monetization, Selection, Company Builder, Coding Router, QA, Treasury, Commercialization, or the External Action Gateway.

Canonical lineage:
Founder Idea / Autonomous Opportunity → Research → Monetization → Selection → Venture Blueprint → BuildPackage → BuildGraph → Coding Router (Native / Cursor / Multi-Agent) → Infinity QA + bounded repair → ProductionArtifact → CommercializationPlan → Treasury authorization → External Action Gateway requirements → Launch readiness.

V1 stops at READY / READY_FOR_CONTROLLED_LAUNCH. READY is not PUBLICLY_LAUNCHED. Technical failure is not business REJECT. Business VALIDATE does not silently build. ZTP does not depend on FAVC1; future autonomous cycles may invoke ZTP.

## 15f. Live Deployment Provider Enablement — Vercel
A provider capability becomes `LIVE_WRITE_VERIFIED` only after a real governed provider mutation succeeds and its result is durably recorded and verified. Verification is capability-scoped. Read-only verification still never implies write authority for other actions.

Vercel is `LIVE_WRITE_VERIFIED` only for:

- `hosting.create_project`
- `hosting.deploy`
- `hosting.verify_deployment`

A successful hosting deploy does not grant authority for DNS, domains, payments, repository writes, migrations, or public launch.

Governed Vercel live path evidence (one successful real deployment; replay protection verified; deployment verification verified; public launch remained unauthorized; cost remained UNKNOWN):

- Project: `prj_188YspuXKKVurXCf2lxnP4ywyggg`
- Deployment: `dpl_CyrDa7dr6aJKTT8ZEfRDEKmvwbi2`
- CREATE: `87432664-8f16-4631-af96-37a464db2cef`
- DEPLOY: `b28e3101-0a0f-4b14-afb0-d1403f854552`
- VERIFY: `f48da405-d8dc-45c4-8648-f19742a3bf49`

`publicLaunchAuthority` remains false. Authorized ceiling is not actual spend. Unknown Vercel cost must not be recorded as $0 spent.

## 16. Autonomy Boundary
The architectural goal is autonomous execution, not arbitrary execution.

Infinity should use:
- policy
- permissions
- allowlists
- evidence
- economics
- quality gates
- deterministic scoring
- adversarial review
- task-specific blocking requirements

to decide what can proceed.

No global human-approval stage should be reintroduced unless explicitly required by product policy or a genuinely specific artifact/action constraint.

## 17. Definition of Success
Infinity succeeds when it can autonomously discover a viable opportunity, prove monetization potential, decide what company/product/assets/acquisition channels are needed, build and validate them, launch permitted actions, generate revenue, observe performance, and intelligently iterate—with traceable evidence and economics at each major decision.
