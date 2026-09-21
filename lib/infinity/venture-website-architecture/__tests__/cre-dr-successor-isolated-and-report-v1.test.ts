import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { reconstructCreDirectResponseSuccessor } from "../cre-dr-successor";
import { runIsolatedArtifactInstallAndBuild } from "@/lib/infinity/venture-build-orchestration";
import { auditSuccessorAuthorityArtifact } from "../answer-authority/successor-audit";
import { runCreDirectResponseSuccessorMission } from "../answer-authority/successor-mission";
import { pageContent, presentVisualTypes } from "../answer-authority/page-inspect";
import { SUCCESSOR_SUBSTANTIVE_ROUTES } from "../answer-authority/constants";
import { detectCannibalization } from "../cannibalization";
import { seedPageOpportunities } from "../page-opportunity";
import { seedDirectResponseSuccessorPages } from "../page-opportunity-successor";
import { creSiteArchitectureInput } from "../cre-context";

describe("CRE DR successor isolated build and report", () => {
  it("installs and builds the unpublished successor and writes a local report", async () => {
    const successor = await reconstructCreDirectResponseSuccessor();
    const isolated = await runIsolatedArtifactInstallAndBuild({ files: successor.files });
    if (isolated.installResult !== "PASS") {
      throw new Error(`isolated_install_failed:${isolated.install.stderr}\n${isolated.install.stdout}`);
    }
    if (isolated.nextProductionBuild !== "PASS") {
      throw new Error(`isolated_build_failed:${isolated.build.stderr}\n${isolated.build.stdout}`);
    }
    expect(isolated.installResult).toBe("PASS");
    expect(isolated.nextProductionBuild).toBe("PASS");
    const audit = await auditSuccessorAuthorityArtifact({
      files: successor.files,
      architecture: successor.architecture,
      graph: successor.graph,
      artifactId: successor.artifactId,
      digest: successor.digest,
    });
    const mission = await runCreDirectResponseSuccessorMission();
    const evidence = inspectRealMarketEvidence({ now: new Date("2026-08-30T05:04:00.000Z") });
    const pages = successor.architecture.pages;
    const publicRoutes = pages.map((page) => page.route);
    const indexable = pages.filter((page) => page.indexable);
    const newRoutes = ["/resources/cam-costs", "/resources/free-rent", "/resources/rent-escalations", "/resources/gross-vs-net-lease", "/for/tenant-rep-brokers"];
    const visuals = SUCCESSOR_SUBSTANTIVE_ROUTES.map((route) => ({
      route,
      types: presentVisualTypes(pageContent(successor.files, route)),
      viz: (pageContent(successor.files, route).match(/data-visualization/g) ?? []).length,
    }));
    const opportunities = [...seedPageOpportunities(creSiteArchitectureInput("candidate:report")), ...seedDirectResponseSuccessorPages(creSiteArchitectureInput("candidate:report"))];
    const cannibal = detectCannibalization(opportunities.filter((item) => item.status === "SELECTED")).filter((item) => item.action === "REJECT_DUPLICATE" || item.action === "MERGE");
    const report = {
      successor: {
        artifactId: successor.artifactId,
        digest: successor.digest,
        predecessorArtifactId: successor.predecessorArtifactId,
        predecessorDigest: successor.predecessorDigest,
        repairReason: successor.repairReason,
        immutable: successor.immutable,
        deployed: successor.deployed,
        secretScan: successor.secretScan,
        pageCount: successor.architecture.pages.length,
        fileCount: successor.files.length,
        graphNodes: successor.graph.nodes.length,
        graphEdges: successor.graph.edges.length,
        graphOrphans: successor.graph.orphans.length,
        contentReport: successor.contentReport,
      },
      isolated: { npmCi: isolated.installResult, typescript: isolated.typescript, productionBuild: isolated.nextProductionBuild },
      command: mission.commandLiveProof,
      experiment: {
        state: evidence.experiment.state,
        evidenceStart: evidence.clock.evidenceStart,
        deadline: evidence.clock.deadline,
        restarted: evidence.clock.restarted,
        qualified: evidence.counts.qualifiedVisitors,
        strongIntent: evidence.counts.strongIntent,
        pricing: evidence.counts.pricingSelections,
        decision: evidence.decision.currentDecision,
        buildReady: evidence.decision.buildReady,
      },
      routes: {
        public: publicRoutes,
        indexable: indexable.map((page) => page.route),
        newRoutes,
      },
      visuals,
      cannibalization: cannibal.length,
      secretScan: successor.secretScan,
      qc: {
        newClassification: audit.newClassification,
        hardFailPages: audit.hardFailPages,
        coverage: audit.coverage,
        homepage: audit.homepage,
        homepageDr: audit.homepageDr,
        moneyDr: audit.moneyDr.map((item) => item.overall),
        npv: audit.npv,
        hub: audit.hub,
        pageRows: audit.pageRows,
        layers: audit.layers,
        links: audit.links,
        pagesAdequate: audit.pagesAdequate,
        pagesTooShallow: audit.pagesTooShallow,
        pagesUnderVisualized: audit.pagesUnderVisualized,
        pagesWithEmptySpace: audit.pagesWithEmptySpace,
        fillerDetected: audit.fillerDetected,
        deferredIntentionally: audit.deferredIntentionally,
        mappedCount: audit.mappedCount,
        unmappedHighPriority: audit.unmappedHighPriority,
        clusters: audit.clusters,
        citationReadyChunks: audit.citationReadyChunks,
        answerAuthorityReady: audit.answerAuthorityReady,
        npvCitationReadiness: audit.npvCitationReadiness,
        urlMigrationsPerformed: audit.urlMigrationsPerformed,
        sourceQuality: audit.sourceQuality,
        sourceIndependence: audit.sourceIndependence,
        technical: {
          premiumAuthorityOverall: audit.technical.premiumAuthorityOverall,
          geoSeo: audit.technical.geoSeo,
          internalLinks: audit.technical.internalLinks,
          schema: audit.technical.schema,
          metadata: audit.technical.metadata,
          sitemap: audit.technical.sitemap,
          robots: audit.technical.robots,
          accessibility: audit.technical.accessibility,
          thinPages: audit.technical.thinPages,
          duplicateIntentPages: audit.technical.duplicateIntentPages,
          indexableOrphans: audit.technical.indexableOrphans,
          brokenInternalLinks: audit.technical.brokenInternalLinks,
        },
        repair: {
          successorRequired: audit.repair.successorRequired,
          questionsToAdd: audit.repair.questionsToAdd,
          internalLinkRepairs: audit.repair.internalLinkRepairs,
          targetedRepairRequired: audit.repair.targetedRepairRequired,
        },
        gaps: audit.gaps.map((gap) => ({ gapId: gap.gapId, reason: gap.reason, summary: gap.summary })),
      },
    };
    const dir = join(process.cwd(), ".infinity", "mission-activity");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "cre-dr-successor-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    expect(audit.newClassification).toBe("PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD");
    expect(mission.commandLiveProof.activeAfter).toBe(0);
  }, 300000);
});
