import { askReviewOperatorFacts } from "@/lib/infinity/askreview-product/legal";
import { ASKREVIEW_WORKING_NAME } from "@/lib/infinity/second-venture-factory/constants";

export default function AskReviewSupportPage() {
  const facts = askReviewOperatorFacts();
  return (
    <main className="askreview-main">
      <h1>Help and support</h1>
      <p>
        {ASKREVIEW_WORKING_NAME} support is handled by {facts.legalEntity}. Email {facts.supportEmail}.
        Mail: {facts.address}.
      </p>
      <ul>
        <li>Password reset is not self-serve in this version. Email support from the account address.</li>
        <li>AskReview does not send SMS or email to your customers.</li>
        <li>Payment is not activated, so there are no billing charges to reverse on this surface.</li>
        <li>If a kit fails, correct the Place ID and generate again.</li>
      </ul>
    </main>
  );
}
