import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { SITE } from "@/lib/site";
import s from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description: `Suggest a brief, ask for a model, or report a problem. Email ${SITE.contactEmail} or use the form; we reply within two business days.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="wrap">
      <div className={s.grid}>
        <header className={s.head}>
          <p className="eyebrow">Contact</p>
          <h1 className="h1">Talk to us.</h1>
          <p className="lede">Suggest a brief, ask for a model, point out something unfair, or just say what you saw.</p>
          <div className={s.direct}>
            <span className="faint">Email</span>
            <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
            <span className="faint">We reply within two business days.</span>
          </div>
        </header>
        <div className={`module ${s.form}`}>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
