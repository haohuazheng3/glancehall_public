import type { Metadata } from "next";
import { DocPage } from "@/components/DocPage";
import { FAQ } from "@/lib/faq";
import { JsonLd, faqLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Why there are no scores, which settings each model used, why there's only one attempt per model, and how to run the builds yourself.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqLd(FAQ)} />
      <DocPage eyebrow="FAQ" title="Questions, answered" intro="If yours isn't here, ask us on the contact page.">
        {FAQ.map((f) => (
          <section key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </section>
        ))}
      </DocPage>
    </>
  );
}
