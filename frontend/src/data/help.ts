/**
 * Explanations behind every `?` hint in the app.
 *
 * Kept in one file rather than scattered as props so the wording can be
 * audited in one place — particularly the `data` and `access` lines, which
 * make factual claims about endpoints, tables and role gates that will go
 * stale if the backend moves and nobody looks here.
 *
 * `data` names the endpoint and the tables behind it. `access` states the real
 * gate: the sidebar entries in `roles.ts`, the `RoleRoute` wrappers in
 * `App.tsx`, and the `require_role(...)` dependency on the endpoint itself,
 * whichever is narrowest.
 *
 * Where a feature is not currently functional, the text says so. A hint that
 * describes a dead screen as working is worse than no hint.
 */

export interface HelpEntry {
  /** One line: what this is. */
  what: string;
  /** How it is produced — the mechanism, not the marketing. */
  how: string;
  /** Endpoint and underlying tables. */
  data: string;
  /** Who can reach it, and who cannot. */
  access: string;
  /** Set when the feature is stubbed or degraded, shown as a warning line. */
  caveat?: string;
}

export const HELP: Record<string, HelpEntry> = {
  // ---------------------------------------------------------------- screens
  bank: {
    what: 'Every question that has passed both reviews and locked into the bank.',
    how: 'Lists items with status in_bank only — drafts and items still in review are excluded. Each row shows the blended difficulty tag, lifetime attempt count and IRT discrimination.',
    data: 'GET /api/questions → the question table, with subject and topic resolved through the request entry the item was authored against.',
    access: 'Every signed-in staff role: QBM, HOD, faculty, SME and examiner. Students do not see this screen.',
  },
  analytics: {
    what: 'Bank-wide psychometrics: how the whole question bank is behaving.',
    how: 'Aggregates the lifetime figures stored on each in-bank item — difficulty distribution, response volume by subject, and a queue of items whose discrimination is poor or negative.',
    data: 'GET /api/analytics/overview → question rows where status is in_bank, pooled across every sitting.',
    access: 'QBM and HOD have it in the sidebar. The endpoint also admits faculty, SME and examiner; students are refused.',
  },
  itemAnalysis: {
    what: 'One item at a time, with its Item Characteristic Curve and psychometrics.',
    how: 'Draws the fitted 3PL curve for the selected item and lists how it performed in each exam it appeared in. Lifetime figures and per-sitting figures are shown side by side because they answer different questions.',
    data: 'GET /api/analytics/items/{id} → the question row for lifetime values, plus its exam_paper_question rows for per-sitting values.',
    access: 'QBM and HOD from the sidebar; the endpoint also admits faculty, SME and examiner. Not available to students.',
  },
  requests: {
    what: 'Question requests: what the bank is missing and who is filling it.',
    how: 'A QBM records a gap, the HOD assigns it to a faculty member, and progress counts the questions submitted against the number asked for.',
    data: 'GET /api/requests → request_entry rows where is_active is true. Back-fill entries created by the data loader are inactive and deliberately hidden here.',
    access: 'QBM and HOD. Creating and assigning requests requires the same two roles on the server.',
  },
  finalReview: {
    what: 'The last gate before a question enters the bank.',
    how: 'Shows items the SME has already accepted. A QBM decision here either locks the item into the bank or sends it back to the author with mandatory remarks.',
    data: 'GET /api/questions filtered to status under_med_edu_review, with the review history attached.',
    access: 'QBM only — it is the second half of a two-person review, so the SME who accepted the item cannot also sign it off.',
  },
  reviewQueue: {
    what: 'Subject-matter review: the first of the two review stages.',
    how: 'Items submitted by faculty arrive here. Accepting forwards the item to the QBM for final review; requesting a correction returns it to the author with a notification and mandatory remarks.',
    data: 'GET /api/questions filtered to status under_departmental_review, with reviews and author attached.',
    access: 'SME. QBM sees the equivalent screen for the final stage instead.',
  },
  department: {
    what: 'Departmental workload: who is authoring what, and what is outstanding.',
    how: 'Counts each faculty member’s authored, in-bank and pending items, and lists open requests with the option to assign one.',
    data: 'GET /api/users and GET /api/requests, joined against question counts per author.',
    access: 'HOD and QBM only, enforced both by the sidebar and by a RoleRoute wrapper on the page.',
  },
  facultyDetail: {
    what: 'One faculty member’s authoring record.',
    how: 'Their questions grouped by lifecycle status, so a HOD can see where someone is stuck before assigning more work.',
    data: 'GET /api/users/{id} and the question rows where submitted_by is that user.',
    access: 'HOD and QBM only.',
  },
  accounts: {
    what: 'Staff account provisioning and role assignment.',
    how: 'Creates accounts, changes somebody’s job title and deactivates access. Deactivating preserves the person’s authoring history rather than deleting it. The Admin column grants and revokes the operational role on top of a job title, and appears only if you hold that role yourself.',
    data: 'GET /api/users → the users table joined to roles through user_role. Students are excluded from this list.',
    access: 'QBM runs the directory — creating accounts, changing roles, deactivating. Granting or revoking `admin` requires `admin`, because whoever can grant it controls the system. The last remaining admin cannot be revoked by anyone, including themselves.',
  },
  paperBuilder: {
    what: 'Assembles an exam paper from approved bank items.',
    how: 'Either pick items by hand, or hand it a Table of Specification and let it fill each quota. Blueprint slots the bank cannot fill are reported rather than silently under-filled.',
    data: 'GET /api/questions for the pool and GET /api/tos for blueprints; saving writes exam_paper and exam_paper_question rows.',
    access: 'QBM, HOD and examiner.',
  },
  paperDetail: {
    what: 'How one sitting of one paper actually behaved.',
    how: 'Every figure here is measured inside this sitting alone, not pooled across exams. That matters because a candidate’s score is only comparable against the other items on the same paper.',
    data: 'GET /api/analytics/papers/{id} → exam_paper_question for per-item values and paper_stat for test-level values, both written by the calibration run.',
    access: 'All staff roles may view. Only QBM and HOD can trigger a recalibration.',
  },
  newAdmissionTest: {
    what: 'End-to-end setup for an admission test.',
    how: 'Walks through blueprint, item selection and paper creation in one flow, rather than assembling the pieces separately.',
    data: 'Writes exam_paper, exam_paper_question and the TOS rows behind them.',
    access: 'Examiner and QBM.',
  },
  facultyDashboard: {
    what: 'A faculty member’s own authoring workspace.',
    how: 'Collects the requests assigned to you, questions needing correction, and everything you have written with its current status.',
    data: 'GET /api/questions and GET /api/requests, both filtered to the signed-in user.',
    access: 'Faculty. Other roles have their own workspace as their landing page.',
  },
  addQuestion: {
    what: 'Authoring an MCQ, with live assistance as you type.',
    how: 'Classification, stem, options and metadata. The AI difficulty signal and the duplicate check run server-side on a debounce while you write, so problems surface before submission rather than at review.',
    data: 'POST /api/questions on save; the live panels call POST /api/ai/analyze and GET /api/questions/similar.',
    access: 'Faculty author here. QBM and HOD can also reach the form.',
  },
  worksheetBuilder: {
    what: 'Assembles a practice worksheet from bank items.',
    how: 'Filter the bank by subject and difficulty, pick items, and export. Separate from the paper builder because a worksheet is not a measured sitting and produces no psychometrics.',
    data: 'GET /api/questions, restricted to in-bank items.',
    access: 'Faculty.',
  },
  notifications: {
    what: 'What has happened to your questions.',
    how: 'A row appears when a reviewer requests a correction or an item changes state. Notifications are addressed to individual recipients, not broadcast.',
    data: 'GET /api/notifications → the notifications table joined to notification_user for the recipient list.',
    access: 'Every signed-in user sees only their own.',
  },

  diagnostics: {
    what: 'Read-only health checks over the database and this server’s configuration.',
    how: 'Runs a set of checks on request and reports what is wrong, what is drifting, and what to do about it. Each check exists because something actually broke — stale response counts, orphaned rows and uncalibrated papers all shipped past a green test suite and a healthy-looking UI.',
    data: 'GET /api/diagnostics. Queries the schema and every table directly; it writes nothing and caches nothing, so the report is always current.',
    access: 'The `admin` role only — deliberately not QBM. The report names tables, row ids and which parts of the configuration are set, which is operator information rather than something an examinations role should acquire as a side effect. `admin` is granted on top of somebody’s real role, so administering the system does not cost you your workspace. Secrets are reported as set or unset and never echoed.',
  },

  // ---------------------------------------------------------- student screens
  practice: {
    what: 'Practise against real bank questions with immediate feedback.',
    how: 'Intended to serve in-bank items one at a time and grade each answer on the server, so the answer key is never sent for an unattempted question.',
    data: 'GET /api/practice.',
    access: 'Students only.',
    caveat: 'Not currently functional. The endpoint returns an empty list — the student workflow is stubbed out pending implementation.',
  },
  mock: {
    what: 'Sit a timed paper with feedback withheld until submission.',
    how: 'Intended to draw a shuffled selection matching your chosen scope and grade the whole paper on submit.',
    data: 'GET and POST /api/mock-exams.',
    access: 'Students only.',
    caveat: 'Not currently functional. Listing returns empty and starting an exam returns 501 — the student workflow is stubbed out.',
  },
  progress: {
    what: 'Your practice accuracy, streak and per-subject breakdown.',
    how: 'Intended to count first attempts only, so re-answering a question you have already seen cannot inflate accuracy.',
    data: 'GET /api/progress/me.',
    access: 'Students only.',
    caveat: 'Not currently functional. The frontend calls /progress/me while the server exposes /progress, and the handler returns zeroes regardless.',
  },

  // ----------------------------------------------------------------- panels
  difficultyScore: {
    what: 'The blended difficulty tag, from 0 (easy) to 1 (hard).',
    how: 'Three signals combined: the author’s estimate, an AI reading of the question text, and how students actually performed. The student weight grows as responses accumulate — up to 0.8 — so real data progressively outweighs the prior.',
    data: 'Stored on the question row and recomputed whenever the item is recalibrated.',
    access: 'Visible to all staff roles wherever an item is listed.',
  },
  signalWeighting: {
    what: 'How much each of the three signals contributes right now.',
    how: 'With no responses the faculty and AI signals carry half each. As attempts accumulate the student weight rises toward 0.8 and the other two shrink proportionally; the prior never disappears entirely.',
    data: 'Derived from the item’s response count at render time.',
    access: 'All staff roles.',
  },
  aiAnalysis: {
    what: 'The AI difficulty signal, derived from the question text alone.',
    how: 'Reads vignette length, negation or "except" framing, lab values, distractor similarity and cognitive verbs. Offline and deterministic by default; a real LLM chain can be switched on server-side.',
    data: 'POST /api/ai/analyze. It never sees student responses — it is a text signal only, which is why it can run before anyone has answered.',
    access: 'Faculty while authoring; the stored result is visible to reviewers.',
  },
  aiReview: {
    what: 'A qualitative critique of the item: fairness, clarity and distractor quality.',
    how: 'Deliberately separate from the difficulty signal and run on demand rather than as you type, because it costs a real model call. If no provider key is configured the feature reports itself unavailable rather than guessing.',
    data: 'POST /api/ai/critique, forwarded to the configured provider.',
    access: 'Faculty and reviewers.',
  },
  duplicateCheck: {
    what: 'Near-duplicate detection against the existing bank.',
    how: 'Compares the content words of your stem against in-bank items and reports the overlap as a percentage. Runs on a debounce as you type so a paraphrased duplicate surfaces before a reviewer spends time on it.',
    data: 'GET /api/questions/similar, comparing against in-bank items only.',
    access: 'Faculty while authoring.',
  },
  iccCurve: {
    what: 'The Item Characteristic Curve: probability of a correct answer against student ability.',
    how: 'A fitted 3PL model. Its position on the x-axis is difficulty, its steepness is discrimination, and the height it starts at is the guessing floor.',
    data: 'Fitted with the girth library from stored responses; parameters live on the question row and on each exam_paper_question row.',
    access: 'All staff roles.',
  },
  discrimination: {
    what: 'Discrimination (a): how sharply the item separates strong students from weak ones.',
    how: 'Higher is better. Near zero means the item tells you little; negative means weaker students outperformed stronger ones, which usually indicates a wrong answer key or a trick element.',
    data: 'The a parameter from the 3PL fit.',
    access: 'All staff roles.',
  },
  pValue: {
    what: 'p-value: the proportion of candidates who answered correctly.',
    how: 'A plain difficulty measure — 0.9 means nearly everyone got it right. Read it alongside discrimination, since an easy item can still be a good one.',
    data: 'Computed from stored responses; the per-sitting value is on exam_paper_question, the lifetime value on the question row.',
    access: 'All staff roles.',
  },
  pointBiserial: {
    what: 'Point-biserial: correlation between getting this item right and scoring well overall.',
    how: 'Measured against the candidate’s score on the *other* items, so the item is not correlated with itself. Low or negative values point at the same problems discrimination does, computed a different way.',
    data: 'Computed at calibration from stored responses.',
    access: 'All staff roles.',
  },
  reliability: {
    what: 'KR-20: how consistently the paper as a whole ranks candidates.',
    how: 'Cronbach’s alpha for right/wrong items. Below about 0.7 the paper is not measuring one thing reliably enough to rank on. It is a property of a whole sitting — a single question has no internal consistency.',
    data: 'Computed over the candidates who answered every item, and stored on paper_stat.',
    access: 'All staff roles may view; QBM and HOD can recalibrate.',
  },
  modelFit: {
    what: 'Infit and outfit: whether responses match what the fitted curve predicts.',
    how: 'Both are mean-square residuals around 1.0. Outfit reacts to surprising answers from candidates far from the item’s difficulty, so a lucky guess moves it sharply; infit is weighted toward candidates near the item’s difficulty and is the more diagnostic of the two. Each item is judged against its own paper’s median rather than a fixed band, because short papers run low across the board.',
    data: 'Computed at calibration and stored per sitting on exam_paper_question.',
    access: 'All staff roles.',
  },
  needsAttention: {
    what: 'Items that misbehaved and are worth a human look.',
    how: 'Collects poor or negative discrimination and, on a paper, items that do not fit the model. Sorted worst-first. Flags are advisory — a flagged item is not suppressed, because difficulty is recovered far more reliably than discrimination.',
    data: 'Derived at request time from the stored psychometrics.',
    access: 'All staff roles.',
  },
  responseDistribution: {
    what: 'How many candidates chose each option.',
    how: 'Intended to expose distractors nobody picks, which make an item easier than it looks.',
    data: 'Would require the chosen option per response.',
    access: 'All staff roles.',
    caveat: 'Permanently empty on the current schema: responses record only whether the answer was right, with no record of which option was selected, so distractor efficiency cannot be computed.',
  },
  lifecycle: {
    what: 'Where a question sits in the authoring and review workflow.',
    how: 'Request → author → SME review → final QBM review → locked into the bank. Remarks are mandatory on every decision and a correction returns the item to its author.',
    data: 'The question status column, with the review rows recording how it got there.',
    access: 'Visible to all staff; who can advance an item depends on the stage.',
  },
  tos: {
    what: 'Table of Specification: the blueprint a paper is built against.',
    how: 'Sets how many questions each topic and cognitive level should contribute. The paper builder fills those quotas and reports any it cannot.',
    data: 'GET /api/tos → the tos and tos_entry tables.',
    access: 'QBM and HOD create and edit blueprints; examiners build papers from them.',
  },
};

export type HelpId = keyof typeof HELP;
