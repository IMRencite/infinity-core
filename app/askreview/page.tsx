import Link from "next/link";
import { ASKREVIEW_APP_PATH, ASKREVIEW_LOGIN_PATH } from "@/lib/infinity/second-venture-factory/constants";

export default function AskReviewHomePage() {
  return (
    <main className="askreview-main">
      <section className="askreview-hero">
        <p>For local shops, salons, restaurants, contractors, and professional-service offices.</p>
        <h1>Generate a Google review request your customer can actually use.</h1>
        <p>
          AskReview is independent software. It is not a Google partner, certified, or endorsed product.
          It generates a review link, a printable QR mark, and request copy for a saved business location.
        </p>
        <p>
          It does not send SMS or email. It does not post reviews. It does not invent a Place ID from a
          business name. Purchase is not available — payment is not activated.
        </p>
        <p>
          Current status: validation-stage product. Existing accounts sign in directly. There is no checkout
          path and no public launch.
        </p>
        <p>
          <Link className="askreview-btn" href={ASKREVIEW_LOGIN_PATH}>Sign In</Link>
          {" "}
          <Link className="askreview-btn askreview-btn--ghost" href={ASKREVIEW_APP_PATH}>Open the kit builder</Link>
        </p>
      </section>
      <section id="how-it-works" className="askreview-card" style={{ marginTop: "2rem" }}>
        <h2>What AskReview does</h2>
        <ol>
          <li>Sign in and save a location with a Google Place ID or a Maps URL that contains one.</li>
          <li>Generate a review-request kit: canonical review URL, QR, and counter / text / email copy.</li>
          <li>Reopen saved locations and prior kits. Print or copy the materials yourself.</li>
        </ol>
        <h2>What it does not do</h2>
        <ul>
          <li>It does not message your customers.</li>
          <li>It does not guarantee reviews, ranking, or Google visibility.</li>
          <li>It does not accept payment on this surface.</li>
        </ul>
        <p>
          Demand evidence comes from Infinity Opportunity Scanner and Monetization Engine records.
          No customer testimonials are shown because none are claimed.
        </p>
      </section>
    </main>
  );
}
