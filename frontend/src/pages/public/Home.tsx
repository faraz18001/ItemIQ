import { Link } from 'react-router-dom';

/* Hallmark · genre: editorial · macrostructure: Long Document · theme: custom
   crimson-tinted OKLCH · enrichment: Tier-B hand-built SVG (ICC curve) · nav:
   N1-adjacent masthead · footer: Ft4 colophon · design-system: design.md */

/** 3PL ICC: P(θ) = c + (1 − c) / (1 + e^(−a(θ − b))) — the product's signature. */
function icc(theta: number, a: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

/** Map θ ∈ [−3, 3] and P ∈ [0, 1] onto a 400 × 260 viewBox. */
const X = (t: number) => 40 + ((t + 3) / 6) * 320;
const Y = (p: number) => 226 - p * 196;

function curvePath(a: number, b: number, c: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = -3 + (6 * i) / 60;
    const p = icc(t, a, b, c);
    pts.push(`${i === 0 ? 'M' : 'L'}${X(t).toFixed(1)} ${Y(p).toFixed(1)}`);
  }
  return pts.join(' ');
}

const FEATURES = [
  { lead: 'Difficulty from three signals.', body: 'Faculty judgement, AI text analysis, and student response data feed one tag. The weighting shifts toward real data as attempts accumulate.' },
  { lead: 'Item Response Theory.', body: 'Every item gets a 3PL curve: discrimination, difficulty, guessing. Items that fail to separate strong students from weak ones flag themselves.' },
  { lead: 'Authoring and review.', body: 'Request, author, SME review, final approval. Remarks are mandatory and every correction loops back to the author with a trail.' },
  { lead: 'Paper generation.', body: 'Build a paper by hand, or hand the generator a table of specifications and let it fill every quota for you.' },
  { lead: 'Five roles, one system.', body: 'QBM, HOD, faculty, SME, examiner. Each one lands in a workspace built around what they actually do.' },
  { lead: 'Duplicate detection.', body: 'Every submission is checked against the whole bank, so paraphrased near-duplicates surface before a reviewer spends time on them.' },
];

const STEPS = [
  { n: '01', t: 'Request', d: 'The QBM says what the bank is missing. The HOD routes it to faculty.' },
  { n: '02', t: 'Author', d: 'Faculty write the item. AI analysis and duplicate checks run as they type.' },
  { n: '03', t: 'Review', d: 'The SME accepts, corrects, or rejects it. Then the QBM signs off.' },
  { n: '04', t: 'Measure', d: 'Student attempts feed IRT, and the difficulty tag recalibrates.' },
];

export function Home() {
  return (
    <article className="mx-auto max-w-[65ch] px-4 py-16 sm:px-6 lg:py-24">
      {/* Lede */}
      <header>
        <p className="issue-label text-primary">SIUT Examinations</p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          Every question, measured. Not guessed.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          For as long as an institution has examined, difficulty has been a single
          judgement made at authoring time — subjective, static, and hard to defend.
          ItemIQ replaces that guess with a living measurement.
        </p>
      </header>

      <div className="mt-14 space-y-14 leading-[1.7] text-foreground/90">
        {/* The problem */}
        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Difficulty was once a single guess.
          </h2>
          <p className="mt-4">
            A question is not inherently easy or hard. It is easy for the students who
            will sit it, hard for the students who will sit it — and only data can tell
            which. A faculty estimate made in a quiet office predicts little about a
            crowded hall in exam season.
          </p>
          <p>
            ItemIQ stops trusting the guess the moment there is something better to trust.
            Every item in the bank carries a difficulty tag backed by expert judgement,
            text analysis, and how students actually performed on it. The kind you can
            defend in a review meeting.
          </p>
        </section>

        {/* Three signals */}
        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Three signals, one tag.
          </h2>
          <p className="mt-4">
            The final tag blends three sources of evidence, weighting each by how much
            of it there is:
          </p>
          <ul className="mt-6 space-y-4">
            <li>
              <span className="issue-label text-foreground">Faculty</span>
              <p className="mt-1">the author's judgement at the moment of writing.</p>
            </li>
            <li>
              <span className="issue-label text-foreground">AI</span>
              <p className="mt-1">an analysis of the item text itself.</p>
            </li>
            <li>
              <span className="issue-label text-foreground">Students</span>
              <p className="mt-1">
                the empirical evidence — and its weight grows toward 0.8 as attempts
                accumulate, until measurement outweighs opinion entirely.
              </p>
            </li>
          </ul>
          <p>
            When faculty and the AI disagree by a full level before data stabilises, the
            system flags the contradiction instead of burying it.
          </p>
        </section>

        {/* ICC motif — the measured truth of one item */}
        <figure>
          <svg viewBox="0 0 400 260" className="w-full" role="img" aria-label="Item Characteristic Curve: probability of a correct response rises with student ability in an S-shaped curve">
            <line x1="40" y1="226" x2="372" y2="226" stroke="var(--border)" strokeWidth="1" />
            <line x1="40" y1="30" x2="40" y2="226" stroke="var(--border)" strokeWidth="1" />
            <path d={curvePath(1.4, 0, 0.18)} fill="none" stroke="var(--primary)" strokeWidth="2" />
            <line x1={X(-3)} y1={Y(0.18)} x2={X(3)} y2={Y(0.18)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={X(0)} cy={Y(icc(0, 1.4, 0, 0.18))} r="3" fill="var(--primary)" />
          </svg>
          <figcaption className="mt-3 flex items-baseline justify-between gap-4 text-xs text-muted-foreground">
            <span className="font-mono">P(θ)</span>
            <span className="flex-1 text-right">
              Item Characteristic Curve — the probability of a correct answer as ability rises.
              One curve per item, drawn from real responses.
            </span>
            <span className="font-mono">θ</span>
          </figcaption>
        </figure>

        {/* Lifecycle */}
        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            One lifecycle, every question.
          </h2>
          <p className="mt-4">
            Request, author, review, measure — a sequence with a name attached to each step,
            so nothing drifts and nothing is lost.
          </p>
          <ol className="mt-8 space-y-8">
            {STEPS.map((s) => (
              <li key={s.n} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-border pt-4">
                <span className="font-mono text-sm text-primary">{s.n}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">{s.t}</h3>
                  <p className="mt-1 text-muted-foreground">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* What the system does — prose, not tiles */}
        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Six parts, one question bank.
          </h2>
          <p className="mt-4">
            Each one exists because a real step in the examination process needed it.
          </p>
          <div className="mt-6 space-y-5">
            {FEATURES.map((f) => (
              <p key={f.lead}>
                <span className="font-semibold text-foreground">{f.lead}</span>{' '}
                <span className="text-muted-foreground">{f.body}</span>
              </p>
            ))}
          </div>
        </section>

        {/* Close */}
        <footer className="border-t border-border pt-10 text-center">
          <p aria-hidden className="font-display text-2xl text-border">❦</p>
          <p className="mx-auto mt-6 max-w-md text-lg text-foreground/90">
            See it from every role — QBM, faculty author, reviewer, examiner, student.
            Every workspace is seeded with live data.
          </p>
          <p className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
            >
              Enter the workspace <span aria-hidden>→</span>
            </Link>
          </p>
        </footer>
      </div>
    </article>
  );
}
