"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import s from "./Nav.module.css";

const LINKS = [
  { href: "/tasks", label: "Builds" },
  { href: "/models", label: "Models" },
  { href: "/compare", label: "Compare" },
  { href: "/methodology", label: "How we test" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <header className={s.shell}>
      <nav className={`${s.bar} ${scrolled ? s.scrolled : ""}`} aria-label="Main">
        <Link href="/" className={s.brand} aria-label="Home">
          <Logo />
        </Link>
        <ul className={s.links}>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={s.link} aria-current={active(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={s.right}>
          <ThemeToggle />
          <Link href="/#subscribe" className={`btn btn-primary btn-sm ${s.cta}`}>
            Get the next round
          </Link>
          <button
            className={s.menuBtn}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`${s.burger} ${open ? s.burgerOpen : ""}`} />
          </button>
        </div>
      </nav>
      <div id="mobile-menu" className={`${s.sheet} ${open ? s.sheetOpen : ""}`} hidden={!open}>
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={active(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/blog">Journal</Link>
          </li>
          <li>
            <Link href="/about">About</Link>
          </li>
        </ul>
        <Link href="/#subscribe" className="btn btn-primary" style={{ width: "100%" }}>
          Get the next round
        </Link>
      </div>
      {open && <button className={s.scrim} aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} />}
    </header>
  );
}
