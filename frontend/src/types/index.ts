/**
 * Domain types for ItemIQ, derived from the ERD
 * (docs/design/ERD/ERD entities.md). These mirror what the API serialises — see
 * api/serializers.py, which is written to match them field for field.
 */

export type Role = 'qbm' | 'hod' | 'faculty' | 'sme' | 'examiner' | 'student' | 'admin';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionType = 'MCQ' | 'SAQ';

export type QuestionStatus =
  | 'draft'
  | 'submitted'
  | 'under_departmental_review'
  | 'correction_required'
  | 'accepted_departmental'
  | 'under_med_edu_review'
  | 'accepted'
  | 'in_bank'
  | 'rejected'
  | 'retired';

export interface User {
  id: string;
  publicId: string;
  name: string;
  email: string;
  department: string;
  /** Primary job. Drives the sidebar and the workspace landing page. */
  role: Role;
  /**
   * Every role held, including operational ones granted through the user_role
   * junction on top of `role`. Gate operator surfaces on this — an examinations
   * officer who also administers the system is both, and should not have to
   * give up their workspace to see diagnostics.
   */
  roles?: Role[];
  joiningDate: string;
  /** Deactivated accounts keep their history but cannot sign in. */
  isActive?: boolean;
}

/**
 * One programme's claim on one subject, with the attributes that make the
 * pairing an entity in its own right rather than a bare join: how much of the
 * paper the subject should occupy, and whether it is compulsory.
 */
export interface ProgramCoverage {
  subjectId: string;
  weightPercent: number | null;
  isCore: boolean;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  level: string;
  isActive?: boolean;
  /** Subjects this programme covers (ERD: Program_Subject). */
  subjectIds: string[];
  /** The same coverage with its weighting attributes. */
  coverage?: ProgramCoverage[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  /** The discipline that offers this subject — one owner, distinct from the
   *  set of programmes that examine it (see ProgramCoverage). */
  programId?: string | null;
}
export interface Topic { id: string; subjectId: string; name: string; code: string }
export interface Subtopic { id: string; topicId: string; subjectId: string; name: string; code: string }
export interface Description { id: string; subtopicId: string; text: string }

export interface Taxonomy {
  subjects: Subject[];
  topics: Topic[];
  subtopics: Subtopic[];
  descriptions: Description[];
}

export interface Student {
  id: string;
  identifier: string;
  name: string;
  batch: string;
  semester: string;
  discipline: string;
  gpa: number;
  ability: number;
}

export interface QuestionOption {
  id: string;
  label: string;
  position: number;
  text: string;
  /**
   * Absent when the API has redacted the answer key — students do not receive
   * it for a question they have not yet attempted.
   */
  isCorrect?: boolean;
}

export interface IRTParams { a: number; b: number; c: number }

/** Pre-computed Item Characteristic Curve points from compute_icc_curve(). */
export interface ICCCurve { theta: number[]; probability: number[] }

export interface Weights { faculty: number; ai: number; student: number }

export interface QuestionStats {
  nResponses: number;
  pValue: number;
  adjustedPValue: number;
  discriminationIndex: number;
  pointBiserial: number;
  distractorEfficiency: number;
  nonfunctionalDistractors: number;
  optionPicks: number[];
  flagged: boolean;
}

export interface Review {
  id: string;
  questionId: string;
  reviewerId: string;
  stage: 'departmental' | 'med_edu';
  decision: 'accepted' | 'correction_required' | 'rejected';
  remarks: string;
  createdAt: string;
}

export interface TagHistoryPoint {
  n: number;
  label: Difficulty;
  score: number;
  weights: Weights;
  createdAt: string;
  qualityGate: boolean;
}

/**
 * ERD: MarkingScheme. For an MCQ this restates the correct option and the
 * author's explanation, so the detail dialog has no need to render it — it is
 * already showing both. It exists as its own record for the marking path: an
 * SAQ's rubric cannot be derived from options, and a marker needs the answer
 * without the item. Sent on the detail endpoint, null when the key is redacted.
 */
export interface MarkingScheme {
  id: string;
  qType: QuestionType;
  answerRubric: string;
  updatedAt: string | null;
}
export interface Question {
  id: string;
  publicId: string;
  type: QuestionType;
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
  topicName?: string;
  subtopicId?: string;
  subtopicName?: string;
  descriptionId?: string;
  stem: string;
  options: QuestionOption[];
  /** null when the answer key is redacted for this viewer. */
  correctLabel: string | null;
  facultyDifficulty: Difficulty;
  facultySignal: number;
  aiDifficulty: Difficulty;
  aiSignal: number;
  aiReasoning: string;
  cognitiveLevel?: string;
  /** null when the answer key is redacted for this viewer. */
  explanation?: string | null;
  /** Detail endpoints only; null when the answer key is redacted. */
  markingScheme?: MarkingScheme | null;
  reference?: string;
  status: QuestionStatus;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  reviews: Review[];
  tagHistory: TagHistoryPoint[];
  stats: QuestionStats | null;
  irt: IRTParams | null;
  /** Server-computed curve; present on the detail endpoints only. */
  iccCurve?: ICCCurve | null;
  discriminationStatus?: 'ok' | 'poor' | 'negative' | null;
  /** Cohorts that have already sat this item in a real exam. */
  seenByBatches?: string[];
  lastCalibratedAt?: string | null;
  studentSignal: number | null;
  attemptCount: number;
  difficultyTag: Difficulty;
  difficultyScore: number;
  weights?: Weights;
  contradiction: boolean;
  reviewRemark?: string | null;
}

/** A quality problem the server flagged on an item. */
export interface QualityFlag {
  key: string;
  tone: 'warning' | 'serious' | 'critical';
  label: string;
  detail: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: 'Correction_Required' | 'Rejected' | 'Accepted' | 'Final_Rejected';
  message: string;
  relatedQuestionId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  questionId: string;
  actorId: string;
  event: string;
  detail: string;
  createdAt: string;
}

export interface RequestEntry {
  id: string;
  subjectName: string;
  topicName: string;
  subtopicName: string;
  qType: QuestionType;
  qCount: number;
  difficulty: Difficulty;
  status: 'Generated' | 'Assigned' | 'In_Progress' | 'Completed';
  assignedTo: string | null;
  createdAt: string;
  assignedAt: string | null;
  submitted: number;
}

export interface TOSEntry {
  id: string;
  /**
   * A blueprint line pins the taxonomy at whichever depth the programme uses.
   * The admission test is categorised at topic level; an undergraduate paper
   * goes down to the subtopic. Exactly one of these is set.
   */
  topicId?: string | null;
  subtopicId: string | null;
  qType: QuestionType;
  difficulty: string;
  nRequired: number;
  bloom: string | null;
  subtopicName?: string;
  topicName?: string;
  subjectName?: string;
}

export interface TOS {
  id: string;
  title: string;
  programId: string;
  examType: string;
  academicYear: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  entries: TOSEntry[];
}

/** A line in the blueprint editor, before it has been saved. */
export interface TOSEntryDraft {
  topicId?: string | null;
  subtopicId?: string | null;
  qType?: QuestionType;
  difficulty?: Difficulty;
  nRequired: number;
  bloom?: string | null;
}

/** draft → finalised → sat. Reopening a sat paper is refused. */
export type PaperStatus = 'draft' | 'finalised' | 'sat';

export interface ExamPaper {
  id: string;
  tosId: string;
  title: string;
  createdBy: string;
  status: PaperStatus | string;
  examDate: string | null;
  createdAt: string;
  /** The qualification examined — admission tests for nursing, medical
   *  technology and the diplomas are different tests. */
  programId?: string | null;
  examType?: string;
  /**
   * The cohort sitting this paper, e.g. "2028". Batch belongs to the sitting,
   * not the question — an item reused across cohorts keeps accumulating the
   * response data the difficulty engine needs.
   */
  batch: string | null;
  academicYear: string | null;
  questionIds: string[];
}

/**
 * Per-sitting analysis (api/models.py: PaperItemStat, PaperStat).
 *
 * The fields on `Question` are the item's lifetime figures, pooled over every
 * response it has ever collected. These are the same measurements taken inside
 * one exam: the ability each candidate is ranked against is their score on the
 * other items of that same paper, and the IRT fit sees only that cohort. An
 * item can therefore be Hard in one sitting and Medium in the next, which the
 * pooled average hides.
 */
export interface PaperItemStat {
  paperId: string;
  questionId: string;
  position: number;
  nResponses: number;
  pValue: number | null;
  discriminationIndex: number | null;
  pointBiserial: number | null;
  distractorEfficiency: number | null;
  nonfunctionalDistractors: number | null;
  optionPicks: number[];
  /** The difficulty this sitting alone implies, from its own b parameter. */
  difficultyTag: Difficulty | null;
  studentSignal: number | null;
  discriminationStatus?: 'ok' | 'poor' | 'negative' | null;
  irt: IRTParams | null;
  iccCurve?: ICCCurve | null;
  /**
   * How well the fitted curve actually describes these responses. Computed by
   * the API, not by the IRT library — girth returns parameters and nothing
   * else. Null until the item has a fit to be judged against.
   */
  fit?: ItemFit | null;
  /** Observed proportion correct per ability decile, for drawing against the
   *  modelled curve. Detail endpoints only. */
  empiricalIcc?: EmpiricalPoint[] | null;
  calibratedAt: string | null;
}

export interface ItemFit {
  /** Mean-square residuals. Judged against the paper's own median rather than
   *  a fixed band — on a short paper every item's raw value runs low. */
  outfit: number | null;
  infit: number | null;
  chiSquare: number | null;
  /** Small means the item's real curve is not the shape that was fitted. */
  pValue: number | null;
  /**
   * The server's verdict, judged against this paper's median. The mean squares
   * and the chi-square can disagree, so this is the one to render — not a
   * second opinion derived in the browser.
   */
  flagged?: boolean;
}

export interface EmpiricalPoint {
  theta: number;
  observed: number;
  expected: number;
  n: number;
}

/** Test-level performance of one sitting. */
export interface PaperStats {
  nCandidates: number;
  nItems: number;
  /** Cohort mean and SD of the proportion-correct score, 0..1. */
  meanScore: number | null;
  sdScore: number | null;
  /** KR-20 internal consistency; below ~0.7 the paper is not ranking reliably. */
  reliability: number | null;
  meanPValue: number | null;
  meanDiscrimination: number | null;
  calibrated: number;
  flagged: number;
  /** Items whose responses depart from the fitted model more than the rest of
   *  this paper's do. */
  misfitting?: number;
  /** Model-level fit. Only interpretable against the same figures from another
   *  model fitted to the same responses. */
  logLikelihood?: number | null;
  aic?: number | null;
  bic?: number | null;
  calibratedAt: string | null;
}

/** Identifying detail for one sitting. `year` is derived from the exam date. */
export interface PaperMeta {
  id: string;
  title: string;
  status?: PaperStatus | string;
  examDate: string | null;
  year: number | null;
  batch: string | null;
  academicYear: string | null;
  isMock?: boolean;
  examType?: string;
  programId: string | null;
  programName: string | null;
}

/** What the server found in an uploaded response sheet, before committing. */
export interface ImportPreview {
  dryRun: boolean;
  committed: boolean;
  /** Whether the sheet records chosen options or bare right/wrong. */
  mode: 'option' | 'correct';
  candidates: number;
  questionsMatched: number;
  answers: number;
  matchedBy: ('public_id' | 'position')[];
  unmatchedColumns: string[];
  questionsWithoutColumn: string[];
  duplicateCandidates: string[];
  blankCells: number;
  warnings: string[];
  sampleCandidates: string[];
  /** Present only once committed. */
  responsesWritten?: number;
  responsesSuperseded?: number;
  candidatesCreated?: number;
  calibrated?: number;
}

export interface PaperSummary extends PaperMeta {
  stats: PaperStats | null;
}

/** One item's row in one sitting, as returned by /analytics/items/{id}. */
export interface ItemSitting extends PaperItemStat {
  paper: PaperMeta;
}

/** The same rows rolled up by exam year. */
export interface ItemYear {
  year: number;
  sittings: number;
  nResponses: number;
  pValue: number | null;
  irt: IRTParams | null;
}

/** Result of POST /api/attempts — the server decides correctness. */
export interface AttemptResult {
  questionId: string;
  selected: number;
  isCorrect: boolean;
  isFirst: boolean;
  correctLabel: string;
  correctPosition: number | null;
  explanation: string | null;
  skipped?: boolean;
}

export interface SubmissionReviewLog {
  id: string;
  submissionId: string;
  reviewerId: string;
  stage: string;
  decision: string;
  remarks: string | null;
  createdAt: string;
}

export interface PdfSubmission {
  id: string;
  request_id: string | null;
  faculty_id: string;
  pdf_path: string;
  references: string | null;
  status: string;
  created_at: string;
}
