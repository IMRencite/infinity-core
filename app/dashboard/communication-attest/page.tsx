import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CommunicationAttestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ maxWidth: 720, margin: "32px auto", padding: 24 }}>
      <h1>Founder attestation</h1>
      <p>This is one request containing two explicit claims. Do not submit until you can complete both.</p>
      <section>
        <h2>Mailbox / test authorship</h2>
        <p>A. Mailbox role: TEST / PRODUCTION / BOTH / UNKNOWN</p>
        <p>B. Did you personally author provider message 1a0be7a9feee5375 as the test prospect message? YES / NO</p>
      </section>
      <section>
        <h2>Offer truth</h2>
        <p>Confirm current approved OccupancyNPV offer: 3-day free trial, no credit card, no automatic billing, https://occupancynpv.com/pricing</p>
      </section>
      <p>Authenticated as: {user?.email ?? "session required"}</p>
      <p>Submission uses your Founder HQ session. A runtime environment secret is not founder attestation.</p>
    </main>
  );
}
