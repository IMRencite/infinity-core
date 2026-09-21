import Link from "next/link";
import { OccupancynpvPublicImprovementForm } from "../../components/occupancynpv-public-improvement-form";
import { VentureFooter } from "../../components/venture-footer";

export const metadata = {
  title: "Suggest an Improvement | OccupancyNPV",
  robots: { index: true, follow: true },
};

export default function OccupancynpvSuggestImprovementPage() {
  return (
    <>
    <main className="vg-page" data-page-id="/suggest-improvement">
      <div className="vg-container occupancynpv-improvement-page">
        <p className="pv-eyebrow">OccupancyNPV</p>
        <h1>Suggest an Improvement</h1>
        <p className="pv-lede">
          Suggestions are for product, workflow, and result-clarity improvements. After you submit, OccupancyNPV stores the note for review. This is product feedback, not a promise a change will be built. Contact email is optional. Do not send SSNs, bank details, or lease files. Useful examples: a missing input, a confusing NPV label, or a save/archive gap.
        </p>
        <OccupancynpvPublicImprovementForm />
        <p className="occupancynpv-improvement-back"><Link href="/" className="vg-cta vg-cta--secondary">Back to OccupancyNPV</Link></p>
      </div>
    </main>
    <VentureFooter />
    </>
  );
}
