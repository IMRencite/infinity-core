import { askReviewOperatorFacts } from "@/lib/infinity/askreview-product/legal";
import { ASKREVIEW_WORKING_NAME } from "@/lib/infinity/second-venture-factory/constants";

export default function AskReviewTermsPage() {
  const facts = askReviewOperatorFacts();
  return (
    <main className="askreview-main">
      <h1>Terms of Service</h1>
      <p>
        {ASKREVIEW_WORKING_NAME} is operated by {facts.legalEntity}. Support: {facts.supportEmail}. Address: {facts.address}.
        These terms are governed by the laws of {facts.jurisdiction}.
      </p>
      <p>
        AskReview generates review links, QR marks, and request copy from the Place ID or supported Maps URL you provide.
        Outputs are informational tools for your own use. AskReview does not send messages, collect reviews, or operate
        your Google Business Profile.
      </p>
      <p>
        AskReview is independent software. It is not a Google partner, certified, or endorsed product and does not
        guarantee review placement, ranking, or customer response.
      </p>
      <p>
        Live payment is not activated on this surface. There is no paid subscription to cancel here. Future paid terms
        will be published before any charge is collected.
      </p>
      <p>
        These terms cover AskReview only. They do not apply OccupancyNPV lease-comparison or NPV product terms to this
        product.
      </p>
    </main>
  );
}
