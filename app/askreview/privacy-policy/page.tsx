import { askReviewDataInventory, askReviewOperatorFacts } from "@/lib/infinity/askreview-product/legal";
import { ASKREVIEW_WORKING_NAME } from "@/lib/infinity/second-venture-factory/constants";

export default function AskReviewPrivacyPage() {
  const facts = askReviewOperatorFacts();
  const inventory = askReviewDataInventory();
  return (
    <main className="askreview-main">
      <h1>Privacy Policy</h1>
      <p>
        {ASKREVIEW_WORKING_NAME} is operated by {facts.legalEntity}. This page describes account, location, and
        generated-kit data collected on AskReview surfaces. It does not invent additional processors or certifications.
      </p>
      <h2>Operator</h2>
      <p>{facts.legalEntity}<br />{facts.address}<br />Support: {facts.supportEmail}</p>
      <h2>Data we store</h2>
      <ul>
        {inventory.collected.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <h2>Data we do not collect</h2>
      <ul>
        {inventory.notCollected.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <h2>What we do not claim</h2>
      <ul>
        {inventory.notClaimed.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p>{inventory.sending}</p>
      <p>AskReview is independent software and is not a Google partner product.</p>
    </main>
  );
}
