/* Hallmark · genre: editorial · macrostructure: Long Document · theme: custom
   crimson-tinted OKLCH · nav: masthead · footer: colophon · design-system: design.md */

const SECTIONS = [
  {
    title: 'Why it exists',
    paragraphs: [
      'SIUT authors and maintains a large bank of examination questions across subjects like Physics, Biology, Chemistry, and English. Historically, a question’s difficulty was a single faculty guess made at authoring time — subjective and static.',
      'ItemIQ replaces that guess with a living measurement. It combines the faculty estimate, an AI analysis of the question text, and empirical student response data through Item Response Theory, weighting each signal by how much evidence supports it.',
    ],
  },
  {
    title: 'The academic hierarchy',
    paragraphs: [
      'Every question is classified against a Subject → Topic → Subtopic → Description hierarchy, which also drives the Table of Specification — the blueprint that governs how many questions of each type an exam must contain.',
    ],
  },
  {
    title: 'A note on this build',
    paragraphs: [
      'This is a self-contained, browser-only demonstration. All data is seeded in memory on load and authentication is intentionally demo-grade. The production system runs the same difficulty engine and IRT mathematics against a real backend and student response stream.',
    ],
  },
];

export function About() {
  return (
    <article className="mx-auto max-w-[65ch] px-4 py-16 sm:px-6 lg:py-20">
      <header>
        <p className="issue-label text-primary">About</p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Built to make difficulty measurable.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          ItemIQ exists for one reason: the Sindh Institute of Urology &amp; Transplantation
          should never have to argue about how hard a question is.
        </p>
      </header>

      <div className="mt-14 space-y-12 leading-[1.7] text-foreground/90">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h2>
            <div className="mt-3 space-y-3">
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-muted-foreground">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
