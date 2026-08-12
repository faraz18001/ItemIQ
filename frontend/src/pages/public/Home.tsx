import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

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
  { 
    lead: 'Difficulty from three signals.', 
    body: <><strong className="text-primary font-semibold">Faculty, AI, and student data</strong> feed one tag. Weighting shifts toward real data as attempts accumulate.</>
  },
  { 
    lead: 'Item Response Theory.', 
    body: <>Every item gets a <strong className="text-primary font-semibold">3PL curve</strong>. Items that fail to separate strong students from weak ones <strong className="text-primary font-semibold">flag themselves</strong>.</>
  },
  { 
    lead: 'Authoring and review.', 
    body: <>Request, author, SME review, final approval. <strong className="text-primary font-semibold">Remarks are mandatory</strong> and corrections leave a trail.</>
  },
  { 
    lead: 'Paper generation.', 
    body: <>Build a paper by hand, or give the generator a <strong className="text-primary font-semibold">table of specifications</strong> to fill every quota automatically.</>
  },
  { 
    lead: 'Five roles, one system.', 
    body: <><strong className="text-primary font-semibold">QBM, HOD, faculty, SME, examiner</strong>. Each lands in a workspace built around exactly what they do.</>
  },
  { 
    lead: 'Duplicate detection.', 
    body: <>Submissions are checked against the whole bank. <strong className="text-primary font-semibold">Paraphrased near-duplicates surface</strong> before reviewers spend time on them.</>
  },
];

const STEPS = [
  { n: '01', t: 'Request', d: 'The QBM says what the bank is missing. The HOD routes it to faculty.' },
  { n: '02', t: 'Author', d: 'Faculty write the item. AI analysis and duplicate checks run as they type.' },
  { n: '03', t: 'Review', d: 'The SME accepts, corrects, or rejects it. Then the QBM signs off.' },
  { n: '04', t: 'Measure', d: 'Student attempts feed IRT, and the difficulty tag recalibrates.' },
];

// Easing function for smooth, non-bouncy entrances (easeOutQuart)
const TRANSITION = { duration: 0.8, ease: [0.165, 0.84, 0.44, 1] };

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: TRANSITION }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export function Home() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24 overflow-hidden">
      {/* Lede (Hero) */}
      <motion.header 
        className="max-w-3xl"
        initial="hidden"
        animate="visible"
        variants={fadeUpVariants}
      >
        <p className="issue-label text-primary">SIUT Examinations</p>
        <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Every question, measured. Not guessed.
        </h1>
        <p className="mt-8 text-xl leading-relaxed text-muted-foreground max-w-2xl">
          For as long as an institution has examined, difficulty has been a single
          judgement made at authoring time — subjective, static, and hard to defend.
          ItemIQ replaces that guess with a living measurement.
        </p>
        <div className="mt-10">
            <Link
              to="/login"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90 transition-opacity"
            >
              Enter the workspace
            </Link>
        </div>
      </motion.header>

      <div className="mt-32 space-y-32">
        {/* Core Philosophy: Split Grid */}
        <motion.section 
          id="about" 
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariants}
        >
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Difficulty was once a single guess.
            </h2>
            <div className="mt-6 space-y-6 text-lg leading-[1.7] text-foreground/90">
              <p>
                A question is not inherently easy or hard. It is easy for the students who
                will sit it, hard for the students who will sit it — and only data can tell
                which. A faculty estimate made in a quiet office predicts little about a
                crowded hall in exam season.
              </p>
              <p>
                ItemIQ stops trusting the guess the moment there is something better to trust.
                Every item in the bank carries a difficulty tag backed by expert judgement,
                text analysis, and how students actually performed on it.
              </p>
            </div>
          </div>

          <div className="border-t lg:border-t-0 lg:border-l border-border pt-8 lg:pt-0 lg:pl-12">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Three signals, one tag.
            </h2>
            <motion.ul 
              className="mt-8 space-y-8"
              variants={staggerContainer}
            >
              {[
                { label: 'Faculty', desc: "The author's judgement at the moment of writing." },
                { label: 'AI', desc: "An analysis of the item text itself." },
                { label: 'Students', desc: "The empirical evidence — and its weight grows toward 0.8 as attempts accumulate, until measurement outweighs opinion entirely." }
              ].map(item => (
                <motion.li key={item.label} variants={fadeUpVariants}>
                  <span className="issue-label text-primary">{item.label}</span>
                  <p className="mt-2 text-foreground/90 leading-relaxed">{item.desc}</p>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.section>

        {/* ICC Motif */}
        <motion.section 
          className="border-y border-border py-16 lg:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariants}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                The measured truth of an item.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-foreground/90">
                Item Characteristic Curve — the probability of a correct answer as ability rises.
                One curve per item, drawn from real responses. When faculty and the AI disagree 
                before data stabilises, the system flags the contradiction instead of burying it.
              </p>
            </div>
            
            <figure className="lg:col-span-7 w-full">
              <svg viewBox="0 0 400 260" className="w-full" role="img" aria-label="Item Characteristic Curve: probability of a correct response rises with student ability in an S-shaped curve">
                <line x1="40" y1="226" x2="372" y2="226" stroke="var(--border)" strokeWidth="1" />
                <line x1="40" y1="30" x2="40" y2="226" stroke="var(--border)" strokeWidth="1" />
                <motion.path 
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  d={curvePath(1.4, 0, 0.18)} 
                  fill="none" 
                  stroke="var(--primary)" 
                  strokeWidth="2" 
                />
                <line x1={X(-3)} y1={Y(0.18)} x2={X(3)} y2={Y(0.18)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={X(0)} cy={Y(icc(0, 1.4, 0, 0.18))} r="3" fill="var(--primary)" />
              </svg>
              <figcaption className="mt-4 flex items-baseline justify-between gap-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                <span>P(θ) Probability</span>
                <span>θ Student Ability</span>
              </figcaption>
            </figure>
          </div>
        </motion.section>

        {/* Lifecycle - Horizontal Layout */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariants}
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-center mb-16">
            One lifecycle, every question.
          </h2>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12"
            variants={staggerContainer}
          >
            {STEPS.map((s) => (
              <motion.div key={s.n} variants={fadeUpVariants} className="flex flex-col border-t border-primary pt-6">
                <span className="font-mono text-sm text-primary mb-4">{s.n}</span>
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">{s.t}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{s.d}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Features - 3x2 Grid */}
        <motion.section 
          id="features"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariants}
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl mb-12">
            Six parts, one question bank.
          </h2>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12"
            variants={staggerContainer}
          >
            {FEATURES.map((f) => (
              <motion.div key={f.lead} variants={fadeUpVariants} className="border-l border-border pl-6">
                <h3 className="font-semibold text-foreground text-lg mb-2">{f.lead}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </div>

    </div>
  );
}
