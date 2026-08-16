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
→ PerformanceEvent
→ learning/iteration decision

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
