import Link from "next/link";
import { SITE } from "@/lib/site";
import { LogoMark } from "./Logo";
import s from "./Footer.module.css";

const COLS = [
  {
    title: "Watch",
    links: [
      { href: "/tasks", label: "All builds" },
      { href: "/models", label: "Models" },
      { href: "/compare", label: "Head to head" },
      { href: "/blog", label: "Journal" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/methodology", label: "How we test" },
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy#cookies", label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className="wrap">
        <div className={s.top}>
          <div className={s.brand}>
            <Link href="/" className={s.logo} aria-label={`${SITE.name} home`}>
              <LogoMark size={26} />
            </Link>
            <p className={s.tag}>{SITE.tagline}</p>
            <a href={`mailto:${SITE.contactEmail}`} className={s.mail}>
              {SITE.contactEmail}
            </a>
          </div>
          {COLS.map((c) => (
            <div key={c.title} className={s.col}>
              <p className="eyebrow">{c.title}</p>
              <ul>
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={s.bottom}>
          <span>
            © {new Date().getFullYear()} {SITE.name}
          </span>
          <span className={s.indep}>Independent. Not affiliated with Anthropic, OpenAI or any model vendor.</span>
        </div>
      </div>
    </footer>
  );
}
