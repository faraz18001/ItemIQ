import { Link } from 'react-router-dom';

/* Hallmark · genre: editorial · macrostructure: Long Document · theme: custom
   crimson-tinted OKLCH · nav: masthead · footer: colophon · design-system: design.md */

const SECTIONS = [
  {
    title: 'The difficulty intelligence engine',
    paragraphs: [
      'Every item carries a single difficulty tag, computed as a weighted blend of three signals:',
      'final_score = w_faculty·faculty + w_AI·AI + w_student·student — the weighted blend of all three.',
      'The student weight grows with response volume toward 0.80 once n ≥ 100 attempts, so measurement always outweighs opinion in the end. Easy / Medium / Hard fall at 0.40 and 0.65. When faculty and the AI disagree by a full level before data stabilises, the item is flagged for review rather than silently averaged.',
    ],
  },
  {
    title: 'Item Response Theory',
    paragraphs: [
      'Each question is fitted with a 3-parameter logistic model — discrimination (a), difficulty (b), and guessing (c) — rendered as an interactive Item Characteristic Curve.',
      'Items that fail to separate strong students from weak ones flag themselves: a poor discriminator (a &lt; 0.5) and a negative discriminator (a &lt; 0), which usually means a miskeyed item, are surfaced automatically.',
    ],
  },
  {
    title: 'Authoring & review workflow',
    paragraphs: [
      'Request → assign → author → SME review → QBM final review → locked in the bank. Reviewer remarks are mandatory, corrections loop back to the author with a trail, and a full timestamped audit record follows every question.',
    ],
  },
  {
    title: 'Paper generation',
    paragraphs: [
      'Build a paper by hand, selecting against per-item performance metrics — or hand the generator a table of specifications and let it fill every quota, shuffling with Fisher–Yates and supporting per-slot swapping.',
    ],
  },
  {
    title: 'Duplicate detection',
    paragraphs: [
      'At submission time, every item is compared against the whole bank by cosine similarity. Paraphrased near-duplicates that keyword matching would miss surface before a reviewer spends time on them.',
    ],
  },
  {
    title: 'Notifications & analytics',
    paragraphs: [
      'Per-user notifications with unread badges across the shell, plus bank-wide difficulty distribution, response volume, and a “needs attention” queue for flagged items.',
    ],
  },
];

export function Features() {
  return (
    <article className="mx-auto max-w-[65ch] px-4 py-16 sm:px-6 lg:py-20">
      <header>
        <p className="issue-label text-primary">The specification</p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Everything in the spec, realised.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          Six capabilities, each built because a real step in the SIUT examination
          process demanded it. What follows is the honest, technical account.
        </p>
      </header>

      <div className="mt-14 space-y-12 leading-[1.7] text-foreground/90">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h2>
            <div className="mt-3 space-y-3">
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-muted-foreground">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}

        <footer className="border-t border-border pt-8">
          <p className="text-muted-foreground">
            Prefer to see it working?{' '}
            <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              Open a workspace <span aria-hidden>→</span>
            </Link>
          </p>
        </footer>
      </div>
    </article>
  );
}
