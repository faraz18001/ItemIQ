/**
 * Application data, backed by the ItemIQ API.
 *
 * Everything the shell needs is loaded once after sign-in and refreshed after
 * each mutation. At SIUT's scale the whole working set is a few hundred rows,
 * so a single provider is simpler — and fewer round trips — than per-screen
 * fetching. Mutations post to the server and then refresh only the slices they
 * can affect.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type {
  Difficulty, ExamPaper, Notification, PaperStatus, Program, Question, RequestEntry,
  Taxonomy, TOS, TOSEntryDraft, User,
} from '@/types';

export interface NewQuestionInput {
  subtopicId: string;
  descriptionId?: string;
  stem: string;
  options: string[];
  correct: number;
  facultyDifficulty: Difficulty;
  explanation?: string;
  reference?: string;
  submit: boolean;
}

export interface AttemptResult {
  questionId: string;
  selected: number;
  isCorrect: boolean;
  isFirst: boolean;
  correctLabel: string;
  correctPosition: number | null;
  explanation: string | null;
}

export interface ProgressSummary {
  attempted: number;
  correct: number;
  accuracy: number;
  streak: number;
  totalAttempts: number;
  bySubject: { subject: string; correct: number; total: number }[];
}

const EMPTY_TAXONOMY: Taxonomy = {
  subjects: [], topics: [], subtopics: [], descriptions: [],
};

const EMPTY_PROGRESS: ProgressSummary = {
  attempted: 0, correct: 0, accuracy: 0, streak: 0, totalAttempts: 0, bySubject: [],
};

interface DataCtx {
  users: User[];
  taxonomy: Taxonomy;
  /** Qualifications, with the subjects each covers and their weighting. */
  programs: Program[];
  questions: Question[];
  bankQuestions: Question[];
  requests: RequestEntry[];
  tos: TOS[];
  papers: ExamPaper[];
  notifications: Notification[];
  bookmarks: string[];
  progress: ProgressSummary;

  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  userById: (id: string) => User | undefined;

  addQuestion: (input: NewQuestionInput) => Promise<Question>;
  updateQuestion: (id: string, input: Partial<NewQuestionInput>) => Promise<Question>;
  submitQuestion: (id: string) => Promise<void>;
  reviewDecision: (args: {
    questionId: string;
    stage: 'departmental' | 'med_edu';
    decision: 'accepted' | 'correction_required' | 'rejected';
    remarks: string;
  }) => Promise<void>;
  assignRequest: (requestId: string, facultyId: string) => Promise<void>;
  generateRequest: (input: {
    subtopicId: string; qCount: number; difficulty: Difficulty; qType?: 'MCQ' | 'SAQ';
  }) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  recordAttempt: (questionId: string, selected: number) => Promise<AttemptResult>;
  toggleBookmark: (questionId: string) => Promise<void>;
  createPaper: (
    title: string,
    tosId: string | null,
    questionIds: string[],
    meta?: {
      batch?: string | null;
      academicYear?: string | null;
      allowRepeats?: boolean;
      programId?: string | null;
      examType?: string | null;
      examDate?: string | null;
    },
  ) => Promise<ExamPaper>;
  setPaperStatus: (paperId: string, status: PaperStatus) => Promise<void>;
  createTos: (input: {
    title: string;
    programId?: string | null;
    examType?: string;
    academicYear?: string;
    entries: TOSEntryDraft[];
  }) => Promise<TOS>;
}

const DataContext = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const isStudent = session?.role === 'student';

  const [users, setUsers] = useState<User[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(EMPTY_TAXONOMY);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [requests, setRequests] = useState<RequestEntry[]>([]);
  const [tos, setTos] = useState<TOS[]>([]);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [progress, setProgress] = useState<ProgressSummary>(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow response from a previous session overwriting the
  // current one when a user signs out and back in as somebody else.
  const loadId = useRef(0);

  const loadQuestions = useCallback(
    () => api.get<Question[]>('/questions').then(setQuestions),
    [],
  );
  const loadRequests = useCallback(
    () => api.get<RequestEntry[]>('/requests').then(setRequests),
    [],
  );
  const loadPapers = useCallback(
    () => api.get<ExamPaper[]>('/papers').then(setPapers),
    [],
  );
  const loadNotifications = useCallback(
    () => api.get<Notification[]>('/notifications').then(setNotifications),
    [],
  );
  const loadProgress = useCallback(
    () => api.get<ProgressSummary>('/progress/me').then(setProgress),
    [],
  );
  const loadBookmarks = useCallback(
    () => api.get<string[]>('/bookmarks').then(setBookmarks),
    [],
  );

  const refresh = useCallback(async () => {
    if (!session) return;
    const id = ++loadId.current;
    setLoading(true);
    setError(null);
    try {
      // Students have no access to the staff directory, requests, blueprints
      // or papers; asking for them would only produce 403s.
      const [taxonomyData, questionData, notificationData, bookmarkData] = await Promise.all([
        api.get<Taxonomy>('/taxonomy'),
        api.get<Question[]>('/questions'),
        api.get<Notification[]>('/notifications'),
        api.get<string[]>('/bookmarks'),
      ]);
      const staffData = isStudent
        ? {
            users: [] as User[], requests: [] as RequestEntry[], tos: [] as TOS[],
            papers: [] as ExamPaper[], programs: [] as Program[],
          }
        : {
            users: await api.get<User[]>('/users'),
            // Requests are scoped server-side: faculty see only their own, and
            // examiners get a 403 outright. Tolerating that here keeps the
            // authorisation rule in one place (the API) rather than mirroring
            // it in the client, where the two could drift apart.
            requests: await api.get<RequestEntry[]>('/requests').catch(() => [] as RequestEntry[]),
            tos: await api.get<TOS[]>('/tos'),
            papers: await api.get<ExamPaper[]>('/papers'),
            programs: await api.get<Program[]>('/programs'),
          };
      const progressData = isStudent ? await api.get<ProgressSummary>('/progress/me') : EMPTY_PROGRESS;

      if (id !== loadId.current) return;
      setTaxonomy(taxonomyData);
      setQuestions(questionData);
      setNotifications(notificationData);
      setBookmarks(bookmarkData);
      setUsers(staffData.users);
      setRequests(staffData.requests);
      setTos(staffData.tos);
      setPapers(staffData.papers);
      setPrograms(staffData.programs);
      setProgress(progressData);
    } catch (err) {
      if (id !== loadId.current) return;
      setError(err instanceof ApiError ? err.message : 'Could not load data from the server.');
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }, [session, isStudent]);

  useEffect(() => {
    if (!session) {
      setQuestions([]);
      setNotifications([]);
      setBookmarks([]);
      setRequests([]);
      setTos([]);
      setPapers([]);
      setPrograms([]);
      setUsers([]);
      setProgress(EMPTY_PROGRESS);
      setLoading(false);
      return;
    }
    void refresh();
  }, [session, refresh]);

  const userById = useCallback((id: string) => users.find((u) => u.id === id), [users]);

  const addQuestion = useCallback<DataCtx['addQuestion']>(async (input) => {
    const created = await api.post<Question>('/questions', input);
    await Promise.all([loadQuestions(), loadRequests().catch(() => {})]);
    return created;
  }, [loadQuestions, loadRequests]);

  const updateQuestion = useCallback<DataCtx['updateQuestion']>(async (id, input) => {
    const updated = await api.patch<Question>(`/questions/${id}`, input);
    await loadQuestions();
    return updated;
  }, [loadQuestions]);

  const submitQuestion = useCallback<DataCtx['submitQuestion']>(async (id) => {
    await api.post(`/questions/${id}/submit`);
    await loadQuestions();
  }, [loadQuestions]);

  const reviewDecision = useCallback<DataCtx['reviewDecision']>(async ({ questionId, ...body }) => {
    await api.post(`/questions/${questionId}/reviews`, body);
    // A decision can bank a question, notify its author and close a request.
    await Promise.all([loadQuestions(), loadNotifications(), loadRequests().catch(() => {})]);
  }, [loadQuestions, loadNotifications, loadRequests]);

  const assignRequest = useCallback<DataCtx['assignRequest']>(async (requestId, facultyId) => {
    await api.post(`/requests/${requestId}/assign`, { facultyId });
    await loadRequests();
  }, [loadRequests]);

  const generateRequest = useCallback<DataCtx['generateRequest']>(async (input) => {
    await api.post('/requests', input);
    await loadRequests();
  }, [loadRequests]);

  const markNotificationRead = useCallback<DataCtx['markNotificationRead']>(async (id) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await api.post(`/notifications/${id}/read`).catch(loadNotifications);
  }, [loadNotifications]);

  const markAllRead = useCallback<DataCtx['markAllRead']>(async () => {
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    await api.post('/notifications/read-all').catch(loadNotifications);
  }, [loadNotifications]);

  const recordAttempt = useCallback<DataCtx['recordAttempt']>(async (questionId, selected) => {
    const result = await api.post<AttemptResult>('/attempts', { questionId, selected });
    // The attempt lifts redaction on this item and moves the progress numbers.
    await Promise.all([loadProgress(), loadQuestions()]);
    return result;
  }, [loadProgress, loadQuestions]);

  const toggleBookmark = useCallback<DataCtx['toggleBookmark']>(async (questionId) => {
    const has = bookmarks.includes(questionId);
    setBookmarks((b) => (has ? b.filter((x) => x !== questionId) : [questionId, ...b]));
    try {
      if (has) await api.del(`/bookmarks/${questionId}`);
      else await api.post('/bookmarks', { questionId });
    } catch {
      await loadBookmarks();
    }
  }, [bookmarks, loadBookmarks]);

  const createPaper = useCallback<DataCtx['createPaper']>(
    async (title, tosId, questionIds, meta) => {
      const created = await api.post<ExamPaper>('/papers', {
        title, tosId, questionIds, ...meta,
      });
      await loadPapers();
      return created;
    },
    [loadPapers],
  );

  const setPaperStatus = useCallback<DataCtx['setPaperStatus']>(
    async (paperId, status) => {
      await api.post(`/papers/${paperId}/status`, { status });
      await loadPapers();
    },
    [loadPapers],
  );

  const createTos = useCallback<DataCtx['createTos']>(async (input) => {
    const created = await api.post<TOS>('/tos', input);
    setTos((current) => [created, ...current]);
    return created;
  }, []);

  const bankQuestions = useMemo(
    () => questions.filter((q) => q.status === 'in_bank'),
    [questions],
  );

  const value = useMemo<DataCtx>(() => ({
    users, taxonomy, questions, bankQuestions, requests, tos, papers, notifications, bookmarks,
    progress, loading, error, refresh, userById, programs,
    addQuestion, updateQuestion, submitQuestion, reviewDecision, assignRequest,
    generateRequest, markNotificationRead, markAllRead, recordAttempt, toggleBookmark,
    createPaper, setPaperStatus, createTos,
  }), [
    users, taxonomy, questions, bankQuestions, requests, tos, papers, notifications, bookmarks,
    progress, loading, error, refresh, userById, programs,
    addQuestion, updateQuestion, submitQuestion, reviewDecision, assignRequest,
    generateRequest, markNotificationRead, markAllRead, recordAttempt, toggleBookmark,
    createPaper, setPaperStatus, createTos,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataCtx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
