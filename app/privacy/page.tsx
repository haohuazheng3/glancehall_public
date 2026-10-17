import type { Metadata } from "next";
import { DocPage } from "@/components/DocPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${SITE.name} collects, why, which services process it, how long it is kept and how to have it deleted.`,
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <DocPage eyebrow="Legal" title="Privacy policy" updated="October 17, 2026" intro="Short version: no accounts, no payments, no ads, no selling data. Here is everything, in plain words.">
      <h2>Who we are</h2>
      <p>
        {SITE.name} (&quot;we&quot;) runs {SITE.domain}. For anything in this policy, write to{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>

      <h2>What we collect</h2>
      <h3>When you subscribe</h3>
      <p>
        Your email address and the time you subscribed. We use it only to tell you when a new round is published. Every email has
        a way to unsubscribe, and you can also ask us to delete it.
      </p>
      <h3>When you contact us</h3>
      <p>
        The name, email address, topic and message you send, plus a one-way hash of your IP address used to block abuse. We use
        it only to reply to you.
      </p>
      <h3>Analytics</h3>
      <p>
        We use <strong>FlowGlance</strong>, and only FlowGlance, to understand how the site is used: which pages and builds are
        viewed, clicks, scrolling, how visits move through the site, where visitors came from, and errors that happen in your
        browser. FlowGlance is configured with all of its capture features on. That includes <strong>the text you type into and
        submit through our forms</strong> (the subscribe and contact forms) and uploaded images (this site has no upload
        feature). We don&apos;t use analytics for advertising and we don&apos;t sell or share it with advertisers.
      </p>
      <h3>Error reports</h3>
      <p>
        If the site breaks, we record the error message, the technical stack trace, the page address and your browser&apos;s user
        agent so we can fix it. Error reports don&apos;t contain form contents.
      </p>
      <h3>Server logs</h3>
      <p>Our hosting and media providers keep standard request logs (IP address, time, URL, user agent) for security and operations.</p>

      <h2 id="cookies">Cookies and local storage</h2>
      <p>We don&apos;t use advertising cookies. We store these small items in your browser:</p>
      <ul>
        <li>
          <code>theme</code>: whether you chose the light or dark theme.
        </li>
        <li>
          <code>consent.analytics</code>: your analytics choice, so we don&apos;t ask again.
        </li>
        <li>FlowGlance may store an anonymous visitor identifier, only if analytics is allowed.</li>
      </ul>
      <p>
        If you browse from the EU, EEA, UK or Switzerland, analytics stays off until you allow it. Elsewhere it is on by default
        and you can opt out from the banner; to change your choice later, clear this site&apos;s data in your browser and choose
        again.
      </p>
      <p>
        The live builds on this site are written by AI models and run in a sandbox on a separate media domain. They may use your
        browser&apos;s storage on that domain (for example to remember a game&apos;s high score). That storage never reaches us.
      </p>

      <h2>Who processes data for us</h2>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel</td>
            <td>Hosts the website and its server functions.</td>
          </tr>
          <tr>
            <td>Neon</td>
            <td>Database for subscriptions, contact messages and error reports.</td>
          </tr>
          <tr>
            <td>Cloudflare</td>
            <td>Serves the videos and live builds, provides DNS, and forwards email sent to our contact address.</td>
          </tr>
          <tr>
            <td>FlowGlance</td>
            <td>Website analytics, as described above.</td>
          </tr>
        </tbody>
      </table>
      <p>These providers may process data in the United States and other countries, under their own data processing terms.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Subscriptions: until you unsubscribe or ask for deletion.</li>
        <li>Contact messages: up to 24 months, then deleted.</li>
        <li>Error reports: up to 90 days after they are resolved.</li>
        <li>Analytics: according to FlowGlance&apos;s retention settings for our account.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask for a copy of the data we hold about you, ask us to correct or delete it, or object to how we use it. Email{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> and we&apos;ll act within 30 days. If you&apos;re in the
        EU, EEA or UK you can also complain to your data protection authority.
      </p>

      <h2>Children</h2>
      <p>The site is not aimed at children under 16 and we don&apos;t knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we&apos;ll update the date at the top. Significant changes will be announced on the home page.</p>
    </DocPage>
  );
}
