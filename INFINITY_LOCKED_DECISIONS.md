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
