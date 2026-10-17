import s from "./DocPage.module.css";

export function DocPage({ eyebrow, title, intro, updated, children }: { eyebrow: string; title: string; intro?: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="wrap">
      <header className={s.head}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h1">{title}</h1>
        {intro && <p className="lede">{intro}</p>}
        {updated && <p className={s.updated}>Last updated {updated}</p>}
      </header>
      <article className={`module ${s.body}`}>
        <div className="prose">{children}</div>
      </article>
    </div>
  );
}
