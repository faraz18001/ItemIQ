/**
 * Domain types for ItemIQ, derived from the ERD
 * (docs/design/ERD/ERD entities.md). The in-memory demo store is shaped around
 * these — a real backend would serialise the same records.
 */

export type Role = 'qbm' | 'hod' | 'faculty' | 'sme' | 'examiner' | 'student';
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
  role: Role;
  joiningDate: string;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  level: string;
}

export interface Subject { id: string; name: string; code: string }
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
  isCorrect: boolean;
}

export interface IRTParams { a: number; b: number; c: number }

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
  correctLabel: string;
  facultyDifficulty: Difficulty;
  facultySignal: number;
  aiDifficulty: Difficulty;
  aiSignal: number;
  /**
   * No aiReasoning here on purpose: the backend derives it by calling
   * ai_analysis.py, so export-seed.mjs never carries one across.
   */
  cognitiveLevel?: string;
  explanation?: string;
  reference?: string;
  status: QuestionStatus;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  reviews: Review[];
  tagHistory: TagHistoryPoint[];
  stats: QuestionStats | null;
  irt: IRTParams | null;
  studentSignal: number | null;
  attemptCount: number;
  difficultyTag: Difficulty;
  difficultyScore: number;
  weights?: Weights;
  contradiction: boolean;
  reviewRemark?: string;
  /** transient — stripped after seed assembly */
  _responses?: SimResponse[];
}

export interface SimResponse {
  studentId: string;
  selected: number;
  isCorrect: boolean;
  createdAt: string;
}

export interface StoredResponse extends SimResponse {
  questionId: string;
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
  subtopicId: string;
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

export interface ExamPaper {
  id: string;
  tosId: string;
  title: string;
  createdBy: string;
  status: string;
  examDate: string;
  createdAt: string;
  questionIds: string[];
}

export interface SeedData {
  users: User[];
  programs: Program[];
  taxonomy: Taxonomy;
  students: Student[];
  questions: Question[];
  bankQuestions: Question[];
  workflowQuestions: Question[];
  responses: StoredResponse[];
  notifications: Notification[];
  audit: AuditEntry[];
  requests: RequestEntry[];
  tos: TOS[];
  examPapers: ExamPaper[];
}
