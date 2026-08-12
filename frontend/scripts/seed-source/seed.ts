/**
 * Seeds the full ItemIQ demo dataset: users across all five roles, the academic
 * hierarchy, programs and Tables of Specification, the question bank at every
 * lifecycle stage, a simulated student cohort with IRT-consistent responses,
 * exam papers, notifications, and an audit trail. Deterministic across reloads.
 */

import { buildTaxonomy } from './taxonomy';
import { RAW_QUESTIONS, WORKFLOW_QUESTIONS, type RawQuestion } from './questionBank';
import type {
  Difficulty, AuditEntry, ExamPaper, Notification, Program, Question, QuestionOption,
  RequestEntry, SeedData, SimResponse, Student, StoredResponse, Taxonomy, TOS, User,
} from './types';

/**
 * Easy/Medium/Hard -> numeric signal. Kept locally because the exporter drops
 * every derived difficulty field — the backend recomputes all of them from
 * scoring.py — so this only needs to satisfy the Question type.
 */
const labelToScore = (label: Difficulty): number =>
  ({ Easy: 0.25, Medium: 0.5, Hard: 0.75 })[label] ?? 0.5;

/** Normalise an IRT b parameter onto the 0..1 scale. */
const normaliseB = (b: number): number => Math.min(1, Math.max(0, (b + 3) / 6));

let publicIdCounter = 1042;
const nextPublicId = () => `Q-${publicIdCounter++}`;

function isoDaysAgo(days: number, hour = 10): string {
  const d = new Date('2026-07-14T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, (days * 7) % 60, 0, 0);
  return d.toISOString();
}

// ---- Users (five roles) ----------------------------------------------------

/**
 * Staff accounts. Departments are aligned to the taxonomy's subjects (Physics,
 * Chemistry, Biology, English) so that department-scoped behaviour has real
 * data to exercise: each subject has an HOD who owns it and faculty who sit
 * under them. Note the app does not scope by department yet — `department` is
 * currently a display string — so this is groundwork, not a live boundary.
 *
 * u-hod / u-faculty-1 / u-faculty-2 keep their original ids, emails and public
 * ids: the quick-login role cards (ROLE_SAMPLE in AuthContext) resolve HOD by
 * email, and the seeded requests and questions below reference those ids.
 */
export const USERS: User[] = [
  { id: 'u-qbm', publicId: 'QBM-001', name: 'Dr. Ashar Minai', email: 'ashar.minai@siut.edu.pk', department: 'Examinations', role: 'qbm', joiningDate: isoDaysAgo(400) },

  // Heads of department — one per subject, plus the original Physiology HOD
  // that the demo quick-login points at.
  { id: 'u-hod', publicId: 'HOD-001', name: 'Prof. Shagufta Yamin', email: 'shagufta.yamin@siut.edu.pk', department: 'Physiology', role: 'hod', joiningDate: isoDaysAgo(390) },
  { id: 'u-hod-physics', publicId: 'HOD-002', name: 'Prof. Tariq Mahmood', email: 'tariq.mahmood@siut.edu.pk', department: 'Physics', role: 'hod', joiningDate: isoDaysAgo(370) },
  { id: 'u-hod-chemistry', publicId: 'HOD-003', name: 'Prof. Rukhsana Iqbal', email: 'rukhsana.iqbal@siut.edu.pk', department: 'Chemistry', role: 'hod', joiningDate: isoDaysAgo(350) },
  { id: 'u-hod-biology', publicId: 'HOD-004', name: 'Prof. Faisal Siddiqui', email: 'faisal.siddiqui@siut.edu.pk', department: 'Biology', role: 'hod', joiningDate: isoDaysAgo(330) },

  // Faculty, spread across those departments so a per-department view is not
  // uniformly one person.
  { id: 'u-faculty-1', publicId: 'FAC-014', name: 'Dr. Bilal Hussain', email: 'bilal.hussain@siut.edu.pk', department: 'Physics', role: 'faculty', joiningDate: isoDaysAgo(240) },
  { id: 'u-faculty-2', publicId: 'FAC-021', name: 'Dr. Ayesha Raza', email: 'ayesha.raza@siut.edu.pk', department: 'Chemistry', role: 'faculty', joiningDate: isoDaysAgo(180) },
  { id: 'u-faculty-3', publicId: 'FAC-022', name: 'Dr. Hina Qureshi', email: 'hina.qureshi@siut.edu.pk', department: 'Physics', role: 'faculty', joiningDate: isoDaysAgo(160) },
  { id: 'u-faculty-4', publicId: 'FAC-023', name: 'Dr. Usman Malik', email: 'usman.malik@siut.edu.pk', department: 'Biology', role: 'faculty', joiningDate: isoDaysAgo(140) },
  { id: 'u-faculty-5', publicId: 'FAC-024', name: 'Dr. Sadia Noor', email: 'sadia.noor@siut.edu.pk', department: 'Biology', role: 'faculty', joiningDate: isoDaysAgo(120) },
  { id: 'u-faculty-6', publicId: 'FAC-025', name: 'Dr. Zainab Butt', email: 'zainab.butt@siut.edu.pk', department: 'English', role: 'faculty', joiningDate: isoDaysAgo(95) },

  { id: 'u-sme', publicId: 'SME-007', name: 'Prof. Kamran Sheikh', email: 'kamran.sheikh@siut.edu.pk', department: 'Medical Education', role: 'sme', joiningDate: isoDaysAgo(360) },
  { id: 'u-sme-2', publicId: 'SME-008', name: 'Prof. Imran Baig', email: 'imran.baig@siut.edu.pk', department: 'Medical Education', role: 'sme', joiningDate: isoDaysAgo(200) },
  { id: 'u-examiner', publicId: 'EXM-003', name: 'Dr. Nadia Farooq', email: 'nadia.farooq@siut.edu.pk', department: 'Examinations', role: 'examiner', joiningDate: isoDaysAgo(300) },
];

// ---- Programs ---------------------------------------------------------------

export const PROGRAMS: Program[] = [
  { id: 'prog-bsmt', name: 'BS-MT', description: 'BS Medical Technology admission test', level: 'admission' },
  { id: 'prog-mbbs', name: 'MBBS', description: 'Bachelor of Medicine, Bachelor of Surgery (undergraduate)', level: 'undergraduate' },
];

// ---- Simulated student cohort ----------------------------------------------

const FIRST_NAMES = ['Ahmed', 'Sara', 'Fatima', 'Bilal', 'Ayesha', 'Usman', 'Zainab', 'Hassan', 'Mariam', 'Ali', 'Hina', 'Omar', 'Nida', 'Faisal', 'Rabia', 'Tariq', 'Sana', 'Imran', 'Kiran', 'Yusuf'];
const LAST_NAMES = ['Khan', 'Ali', 'Noor', 'Ahmed', 'Raza', 'Tariq', 'Malik', 'Sheikh', 'Butt', 'Qureshi', 'Hussain', 'Iqbal', 'Farooq', 'Siddiqui', 'Baig'];

// Deterministic pseudo-random generator so the cohort is stable across reloads.
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260714);

/** Where the 2028 cohort ends and the 2029 one begins. */
const SENIOR_COHORT_SIZE = 80;

function buildStudents(count = 120): Student[] {
  const students: Student[] = [];
  for (let i = 0; i < count; i++) {
    const fn = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const ability = (rand() + rand() + rand() - 1.5) * 1.6;
    // Two cohorts rather than one. Exposure tracking (batches_seen) and the
    // paper builder's repeat check are per-batch, so a single cohort leaves
    // that whole path untestable — there is never a second batch to compare
    // against. The senior cohort comes first because simulateResponses draws
    // responders from the head of this list, so 2028 carries the exam history
    // and 2029 reads as the newer intake.
    const senior = i < SENIOR_COHORT_SIZE;
    students.push({
      id: `stu-${i}`,
      identifier: senior ? `m22-${1100 + i}` : `m23-${1200 + (i - SENIOR_COHORT_SIZE)}`,
      name: `${fn} ${ln}`,
      batch: senior ? '2028' : '2029',
      semester: 'Sem 1',
      discipline: 'BS-MT',
      gpa: Math.round((2.0 + rand() * 2.0) * 100) / 100,
      ability,
    });
  }
  students[0] = { ...students[0], identifier: 'm22-1042', name: 'Ahmed Khan', gpa: 3.5, ability: 0.6 };
  return students;
}

export const STUDENTS = buildStudents();

// ---- Build the bank ---------------------------------------------------------

function threePL(theta: number, a: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

function optionLabel(i: number): string {
  return String.fromCharCode(65 + i);
}

interface BuildOpts { id: string; seq: number; ageDays?: number; updatedDays?: number }

const DRAFT_STATUSES = new Set([
  'draft', 'submitted', 'under_departmental_review', 'correction_required', 'under_med_edu_review',
]);


function buildQuestion(raw: RawQuestion, taxonomy: Taxonomy, opts: BuildOpts): Question {
  const subtopicId = taxonomy.subtopics.find((s) => s.id === raw.subtopicId)
    ? raw.subtopicId
    : raw.subtopicIdFallback;
  const subtopic = taxonomy.subtopics.find((s) => s.id === subtopicId);
  const topic = taxonomy.topics.find((t) => t.id === subtopic?.topicId);
  const subject = taxonomy.subjects.find((s) => s.id === subtopic?.subjectId);

  const options: QuestionOption[] = raw.options.map((text, i) => ({
    id: `${opts.id}-opt-${i}`,
    label: optionLabel(i),
    position: i,
    text,
    isCorrect: i === raw.correct,
  }));

  const facultyScore = labelToScore(raw.facultyDifficulty);
  const aiScore = labelToScore(raw.aiDifficulty);

  return {
    id: opts.id,
    publicId: DRAFT_STATUSES.has(raw.status) ? `DRAFT-${opts.seq}` : nextPublicId(),
    type: 'MCQ',
    subjectId: subject?.id,
    subjectName: subject?.name,
    topicId: topic?.id,
    topicName: topic?.name,
    subtopicId: subtopic?.id,
    subtopicName: subtopic?.name,
    descriptionId: raw.descriptionId,
    stem: raw.stem,
    options,
    correctLabel: optionLabel(raw.correct),
    facultyDifficulty: raw.facultyDifficulty,
    facultySignal: facultyScore,
    aiDifficulty: raw.aiDifficulty,
    aiSignal: aiScore,
    cognitiveLevel: raw.cognitive,
    explanation: raw.explanation,
    reference: raw.reference,
    status: raw.status,
    authorId: raw.authorId || 'u-faculty-1',
    createdAt: isoDaysAgo(opts.ageDays ?? 60),
    updatedAt: isoDaysAgo(opts.updatedDays ?? 20),
    reviews: [],
    tagHistory: [],
    stats: null,
    irt: null,
    studentSignal: null,
    attemptCount: 0,
    difficultyTag: raw.facultyDifficulty,
    difficultyScore: facultyScore,
    contradiction: false,
    reviewRemark: raw.reviewRemark,
  };
}

/** Generate a plausible response set consistent with the item's IRT parameters. */
function simulateResponses(question: Question, raw: RawQuestion): void {
  if (raw.attempts == null || raw.attempts === 0 || raw.irtB == null) return;
  const a = raw.irtA ?? 1.0;
  const b = raw.irtB;
  const c = 0.22; // 4-option guessing floor
  const n = Math.min(raw.attempts, STUDENTS.length);
  const responders = STUDENTS.slice(0, n);
  const correctOptionIndex = raw.correct;

  let correct = 0;
  const optionPicks: number[] = Array.from({ length: question.options.length }, () => 0);
  const responses: SimResponse[] = [];
  const upper: number[] = [];
  const lower: number[] = [];

  const ranked = [...responders].sort((x, y) => y.ability - x.ability);
  const groupSize = Math.max(1, Math.floor(n * 0.27));
  const upperSet = new Set(ranked.slice(0, groupSize).map((s) => s.id));
  const lowerSet = new Set(ranked.slice(-groupSize).map((s) => s.id));

  responders.forEach((student, i) => {
    const p = threePL(student.ability, a, b, c);
    const isCorrect = rand() < p;
    let picked: number;
    if (isCorrect) {
      picked = correctOptionIndex;
      correct++;
    } else {
      const wrong = question.options.map((_, idx) => idx).filter((idx) => idx !== correctOptionIndex);
      picked = rand() < 0.5 ? wrong[0] : wrong[Math.floor(rand() * wrong.length)];
    }
    optionPicks[picked]++;
    responses.push({ studentId: student.id, selected: picked, isCorrect, createdAt: isoDaysAgo(30 - (i % 30)) });
    if (upperSet.has(student.id)) upper.push(isCorrect ? 1 : 0);
    if (lowerSet.has(student.id)) lower.push(isCorrect ? 1 : 0);
  });

  const pValue = correct / n;
  const upperMean = upper.length ? upper.reduce((s, v) => s + v, 0) / upper.length : 0;
  const lowerMean = lower.length ? lower.reduce((s, v) => s + v, 0) / lower.length : 0;
  let discrimination = upperMean - lowerMean;
  if (a < 0) discrimination = -Math.abs(discrimination) - 0.05;

  const nonFunctional = optionPicks.filter((count, idx) => idx !== correctOptionIndex && count / n < 0.05).length;
  const distractorCount = question.options.length - 1;
  const distractorEfficiency = distractorCount ? (distractorCount - nonFunctional) / distractorCount : 1;

  const meanAbility = responders.reduce((s, r) => s + r.ability, 0) / n;
  const sd = Math.sqrt(responders.reduce((s, r) => s + (r.ability - meanAbility) ** 2, 0) / n) || 1;
  const correctAbilities = responders.filter((_, i) => responses[i].isCorrect).map((r) => r.ability);
  const meanCorrect = correctAbilities.length ? correctAbilities.reduce((s, v) => s + v, 0) / correctAbilities.length : meanAbility;
  const pointBiserial = pValue > 0 && pValue < 1
    ? ((meanCorrect - meanAbility) / sd) * Math.sqrt(pValue / (1 - pValue))
    : 0;

  question.attemptCount = n;
  question.studentSignal = normaliseB(b);
  question.irt = { a: Number(a.toFixed(2)), b: Number(b.toFixed(2)), c };
  question.stats = {
    nResponses: n,
    pValue: Number(pValue.toFixed(3)),
    adjustedPValue: Number(Math.min(1, Math.max(0, pValue - meanAbility * 0.05)).toFixed(3)),
    discriminationIndex: Number(discrimination.toFixed(3)),
    pointBiserial: Number(pointBiserial.toFixed(3)),
    distractorEfficiency: Number(distractorEfficiency.toFixed(3)),
    nonfunctionalDistractors: nonFunctional,
    optionPicks,
    flagged: discrimination < 0.15 || nonFunctional >= 2,
  };
  question._responses = responses;
}

// ---- Reviews & notifications for workflow questions -------------------------

function buildReviewsAndNotifications(questions: Question[]): { notifications: Notification[]; audit: AuditEntry[] } {
  const notifications: Notification[] = [];
  const audit: AuditEntry[] = [];
  let nid = 1;
  let aid = 1;

  for (const q of questions) {
    audit.push({ id: `a-${aid++}`, questionId: q.id, actorId: q.authorId, event: 'created', detail: `Question drafted (${q.publicId})`, createdAt: q.createdAt });

    if (q.status === 'correction_required') {
      q.reviews.push({
        id: `rev-${q.id}-1`, questionId: q.id, reviewerId: 'u-sme', stage: 'departmental',
        decision: 'correction_required', remarks: q.reviewRemark || '', createdAt: isoDaysAgo(8),
      });
      notifications.push({
        id: `n-${nid++}`, recipientId: q.authorId, type: 'Correction_Required',
        message: `Question ${q.publicId} needs correction: ${q.reviewRemark}`,
        relatedQuestionId: q.id, isRead: false, createdAt: isoDaysAgo(8),
      });
      audit.push({ id: `a-${aid++}`, questionId: q.id, actorId: 'u-sme', event: 'review_submitted', detail: 'SME requested correction', createdAt: isoDaysAgo(8) });
    }

    if (q.status === 'under_med_edu_review') {
      q.reviews.push({
        id: `rev-${q.id}-1`, questionId: q.id, reviewerId: 'u-sme', stage: 'departmental',
        decision: 'accepted', remarks: 'Accurate against the cited reference; distractors are well constructed. Forwarding for final review.',
        createdAt: isoDaysAgo(6),
      });
      audit.push({ id: `a-${aid++}`, questionId: q.id, actorId: 'u-sme', event: 'review_submitted', detail: 'SME accepted, forwarded to QBM', createdAt: isoDaysAgo(6) });
    }

    if (q.status === 'under_departmental_review') {
      audit.push({ id: `a-${aid++}`, questionId: q.id, actorId: q.authorId, event: 'submitted', detail: 'Submitted for SME review', createdAt: isoDaysAgo(3) });
    }
  }

  notifications.push({
    id: `n-${nid++}`, recipientId: 'u-faculty-1', type: 'Accepted',
    message: 'Question Q-1044 was accepted into the official question bank.',
    relatedQuestionId: null, isRead: true, createdAt: isoDaysAgo(25),
  });
  notifications.push({
    id: `n-${nid++}`, recipientId: 'u-faculty-2', type: 'Accepted',
    message: 'Question Q-1049 was accepted into the official question bank.',
    relatedQuestionId: null, isRead: true, createdAt: isoDaysAgo(18),
  });

  return { notifications, audit };
}

// ---- Requests (workflow kick-off) ------------------------------------------

function buildRequests(): RequestEntry[] {
  return [
    { id: 'req-1', subjectName: 'Physics', topicName: 'Heat', subtopicName: 'Heat Transfer', qType: 'MCQ', qCount: 5, difficulty: 'Medium', status: 'In_Progress', assignedTo: 'u-faculty-1', createdAt: isoDaysAgo(20), assignedAt: isoDaysAgo(18), submitted: 3 },
    { id: 'req-2', subjectName: 'Chemistry', topicName: 'Stoichiometry', subtopicName: 'Mole Concept', qType: 'MCQ', qCount: 4, difficulty: 'Medium', status: 'In_Progress', assignedTo: 'u-faculty-2', createdAt: isoDaysAgo(15), assignedAt: isoDaysAgo(14), submitted: 2 },
    { id: 'req-3', subjectName: 'Biology', topicName: 'Cell Biology', subtopicName: 'Cell Structure', qType: 'MCQ', qCount: 6, difficulty: 'Easy', status: 'Assigned', assignedTo: 'u-faculty-1', createdAt: isoDaysAgo(9), assignedAt: isoDaysAgo(7), submitted: 1 },
    { id: 'req-4', subjectName: 'English', topicName: 'Grammar', subtopicName: 'Tenses', qType: 'MCQ', qCount: 3, difficulty: 'Hard', status: 'Generated', assignedTo: null, createdAt: isoDaysAgo(2), assignedAt: null, submitted: 0 },
  ];
}

// ---- Table of Specification -------------------------------------------------

function buildTOS(taxonomy: Taxonomy): TOS[] {
  const tos: TOS[] = [
    {
      id: 'tos-bsmt-2026', title: 'BS-MT Admission Test 2026', programId: 'prog-bsmt',
      examType: 'admission', academicYear: '2025-2026', isActive: true, createdBy: 'u-qbm', createdAt: isoDaysAgo(30),
      entries: [
        { id: 'te-1', subtopicId: 'st-heat-transfer', qType: 'MCQ', difficulty: 'medium', nRequired: 4, bloom: null },
        { id: 'te-2', subtopicId: 'st-newton', qType: 'MCQ', difficulty: 'hard', nRequired: 3, bloom: null },
        { id: 'te-3', subtopicId: 'st-free-fall', qType: 'MCQ', difficulty: 'easy', nRequired: 3, bloom: null },
        { id: 'te-4', subtopicId: 'st-cell-structure', qType: 'MCQ', difficulty: 'easy', nRequired: 4, bloom: null },
        { id: 'te-5', subtopicId: 'st-circulatory', qType: 'MCQ', difficulty: 'medium', nRequired: 3, bloom: null },
        { id: 'te-6', subtopicId: 'st-bonds', qType: 'MCQ', difficulty: 'medium', nRequired: 4, bloom: null },
        { id: 'te-7', subtopicId: 'st-mole', qType: 'MCQ', difficulty: 'easy', nRequired: 3, bloom: null },
        { id: 'te-8', subtopicId: 'st-tenses', qType: 'MCQ', difficulty: 'medium', nRequired: 3, bloom: null },
        { id: 'te-9', subtopicId: 'st-reading', qType: 'MCQ', difficulty: 'hard', nRequired: 3, bloom: null },
      ],
    },
    {
      id: 'tos-mbbs-renal', title: 'Renal Physiology Midterm 2026', programId: 'prog-mbbs',
      examType: 'midterm', academicYear: '2025-2026', isActive: true, createdBy: 'u-qbm', createdAt: isoDaysAgo(22),
      entries: [
        { id: 'te-10', subtopicId: 'st-renal', qType: 'MCQ', difficulty: 'medium', nRequired: 4, bloom: 'knows_how' },
        { id: 'te-11', subtopicId: 'st-circulatory', qType: 'MCQ', difficulty: 'hard', nRequired: 3, bloom: 'analysis' },
      ],
    },
  ];
  for (const t of tos) {
    t.entries = t.entries.map((e) => {
      const st = taxonomy.subtopics.find((s) => s.id === e.subtopicId);
      const topic = taxonomy.topics.find((tp) => tp.id === st?.topicId);
      const subject = taxonomy.subjects.find((s) => s.id === st?.subjectId);
      return { ...e, subtopicName: st?.name, topicName: topic?.name, subjectName: subject?.name };
    });
  }
  return tos;
}

function buildExamPapers(): ExamPaper[] {
  return [
    {
      id: 'paper-1', tosId: 'tos-bsmt-2026', title: 'BS-MT Admission Test 2026: Paper A',
      createdBy: 'u-examiner', status: 'finalised', examDate: isoDaysAgo(-14), createdAt: isoDaysAgo(12),
      questionIds: ['q-0', 'q-1', 'q-2', 'q-3', 'q-5', 'q-6', 'q-9', 'q-10', 'q-11', 'q-12'],
    },
  ];
}

// ---- Assemble ---------------------------------------------------------------

export function buildSeed(): SeedData {
  publicIdCounter = 1042;
  const taxonomy = buildTaxonomy();

  const bankQuestions = RAW_QUESTIONS.map((raw, i) => {
    const q = buildQuestion(raw, taxonomy, { id: `q-${i}`, seq: i, ageDays: 90 - i * 3, updatedDays: 30 - i });
    simulateResponses(q, raw);
    return q;
  });

  const workflowQuestions = WORKFLOW_QUESTIONS.map((raw, i) => {
    const q = buildQuestion(raw, taxonomy, { id: `wq-${i}`, seq: 100 + i, ageDays: 20 - i * 2, updatedDays: 5 });
    return q;
  });

  const allQuestions = [...bankQuestions, ...workflowQuestions];
  const { notifications, audit } = buildReviewsAndNotifications(workflowQuestions);

  const responses: StoredResponse[] = [];
  for (const q of bankQuestions) {
    if (q._responses) {
      for (const r of q._responses) {
        responses.push({ questionId: q.id, ...r });
      }
      delete q._responses;
    }
  }

  return {
    users: USERS,
    programs: PROGRAMS,
    taxonomy,
    students: STUDENTS,
    questions: allQuestions,
    bankQuestions,
    workflowQuestions,
    responses,
    notifications,
    audit,
    requests: buildRequests(),
    tos: buildTOS(taxonomy),
    examPapers: buildExamPapers(),
  };
}
