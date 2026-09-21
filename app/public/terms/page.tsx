import { LegalShell } from "@/components/public/legal/legal-shell";
import styles from "@/components/public/legal/legal.module.css";

export default function PublicTermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <section className={styles.section} data-legal-topic="site-use">
        <h2>Site use</h2>
        <p>
          These Terms of Service govern use of the public Infinity OS website at imros.io and the associated
          imros-public pages, including the public Operations Building. The site is operated by Infinite Media
          Resources (IMR) in connection with Infinity OS. By accessing the site, a visitor agrees to these Terms.
          If the visitor does not agree, the visitor should not use the site.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="informational">
        <h2>Informational purpose</h2>
        <p>
          The public Operations Building is an informational visualization of sanitized autonomous venture
          operations. It is not an operator console, customer portal, payment processor, brokerage, bank, or
          investment advisory service. Nothing on the public site is an offer to sell securities, a guarantee of
          venture performance, or authorization to control Infinity systems. Live public activity is abstracted and
          may lag, omit, or generalize private work.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="acceptable-use">
        <h2>Acceptable use</h2>
        <p>
          Visitors may view the public pages, follow published links, and read these legal notices. Visitors may not
          misuse the site, interfere with its operation, attempt to reach private Infinity interfaces through the
          public surface, or present public sanitized activity as if it were a complete private record.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="intellectual-property">
        <h2>Intellectual property</h2>
        <p>
          Infinity OS, IMROS, IMR, OccupancyNPV, and related names, marks, text, design, and software interfaces
          displayed on the public site are owned by IMR or its licensors. Visitors receive a limited, revocable,
          non-transferable permission to view the public pages. No license is granted to copy the Operations
          Building, scrape private endpoints, or reuse Infinity marks in a way that suggests sponsorship without
          permission.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="third-party">
        <h2>Third-party links and services</h2>
        <p>
          The site may link to third-party websites, hosting status pages, or portfolio venture products. Those
          destinations have their own terms and privacy practices. IMR is not responsible for third-party content,
          availability, or practices, and a link is not an endorsement of every statement on the destination site.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="portfolio">
        <h2>Portfolio ventures</h2>
        <p>
          Infinity OS may launch and operate multiple ventures. A public mention of a venture does not merge that
          venture’s contracts into these Terms. OccupancyNPV and any other public venture may have additional
          product terms, acceptable-use rules, billing terms, and privacy notices. Hidden ventures are not part of
          this public site. Individual ventures may have additional venture-specific terms that apply when a person
          uses that product.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="availability">
        <h2>Availability</h2>
        <p>
          We aim to keep the public site available, but we do not warrant uninterrupted access. The Operations
          Building may show a degraded or updating state when the public projection cannot be refreshed. Scheduled
          maintenance, hosting incidents, or changes to sanitized data can alter what is visible. Downtime of the
          public site does not, by itself, mean private Infinity operations have stopped, and uptime of the public
          site is not a service-level commitment to any customer.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="prohibited">
        <h2>Prohibited activity</h2>
        <p>Visitors may not:</p>
        <ul>
          <li>attempt to access private HQ, treasury, runtime, operator, or affiliate systems through this site;</li>
          <li>probe, scan, or overload the public site except as permitted by a written security agreement;</li>
          <li>use the site to send malware, spam, or deceptive communications;</li>
          <li>misrepresent public sanitized activity as customer, financial, or affiliate records;</li>
          <li>copy the site to impersonate Infinity OS, IMR, or a portfolio venture; or</li>
          <li>use the site in violation of applicable law.</li>
        </ul>
      </section>
      <section className={styles.section} data-legal-topic="disclaimers">
        <h2>Disclaimers</h2>
        <p>
          THE PUBLIC SITE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, IMR AND
          INFINITY OS DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. Public activity labels are sanitized
          descriptions, not warranties that a particular private task is running, that a venture will succeed, or
          that any statistic is complete.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="liability">
        <h2>Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IMR, INFINITY OS, AND THEIR PEOPLE WILL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
          DATA, GOODWILL, OR BUSINESS, ARISING FROM USE OF THE PUBLIC SITE. THE AGGREGATE LIABILITY FOR CLAIMS
          RELATING TO THE PUBLIC IMROS SITE WILL NOT EXCEED ONE HUNDRED U.S. DOLLARS ($100) OR THE AMOUNT THE
          VISITOR PAID TO IMR, IF ANY, FOR ACCESS TO THE PUBLIC SITE IN THE THREE MONTHS BEFORE THE CLAIM, WHICHEVER
          IS GREATER. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE PLACES, LIABILITY IS LIMITED TO
          THE FULLEST EXTENT PERMITTED.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="indemnification">
        <h2>Indemnification</h2>
        <p>
          To the extent permitted by law, a visitor who misuses the public site, violates these Terms, or uses the
          site to infringe another person’s rights agrees to indemnify and hold harmless IMR and Infinity OS from
          resulting claims, damages, and reasonable expenses, including attorneys’ fees, except to the extent a
          claim is caused by IMR’s own willful misconduct.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="termination">
        <h2>Termination and access</h2>
        <p>
          We may suspend or terminate access to the public site, in whole or in part, if we believe these Terms were
          violated, if the site is being abused, or if we discontinue the public surface. A visitor may stop using
          the site at any time. Provisions that by their nature should survive — including intellectual property,
          disclaimers, limitation of liability, indemnification, and governing law — survive termination.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="governing-law">
        <h2>Governing law</h2>
        <p>
          These Terms are governed by the laws of the United States and the State of Florida, without regard to
          conflict-of-law rules that would apply a different body of law, except where a mandatory consumer
          protection law of the visitor’s residence cannot be waived. Courts located in Florida will have exclusive
          jurisdiction over disputes arising from the public IMROS site, except that IMR may seek injunctive relief
          in any forum to protect intellectual property or the security of its systems.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="changes">
        <h2>Changes</h2>
        <p>
          We may revise these Terms as the public site or applicable law changes. The effective date will be
          updated when we do. Continued use of the site after a revision constitutes acceptance of the updated
          Terms. A one-sentence terms page is not an acceptable substitute for this document.
        </p>
      </section>
      <section className={styles.section} data-legal-topic="contact">
        <h2>Contact</h2>
        <p>
          Questions about these Terms may be sent to Infinite Media Resources through infinitemediaresources.com.
          Product, billing, or account questions for a portfolio venture must be sent to that venture under its own
          terms.
        </p>
      </section>
      <aside className={styles.notice} data-legal-topic="venture-boundary">
        <p>
          Venture legal boundary: these IMROS Terms cover use of the public Infinity OS site only. They do not
          replace venture-specific terms of service, payment terms, or product licenses. Each venture still
          maintains its own required legal stack.
        </p>
      </aside>
    </LegalShell>
  );
}
