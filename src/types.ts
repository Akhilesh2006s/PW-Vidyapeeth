export type UiLanguage = 'en' | 'te';
export type SpokenLanguage = 'en' | 'te' | 'mixed';
export type SessionStatus = 'in_progress' | 'audio_uploaded' | 'processing' | 'completed' | 'failed';
export type AdmissionStage = 'enquiry' | 'application' | 'counselling' | 'offered' | 'enrolled' | 'withdrawn';
export type Priority = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'counsellor';
  phone: string;
  preferredLanguage: UiLanguage;
}

export interface Counsellor {
  id: string;
  employeeCode: string;
  languages: Array<'en' | 'te'>;
  specializations: string[];
  active: boolean;
}

export interface Parent {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  relation: 'mother' | 'father' | 'guardian' | 'other';
  preferredLanguage: SpokenLanguage;
  notes: string;
  students?: Array<Pick<Student, 'id' | 'fullName' | 'grade' | 'preferredLanguage'> | string>;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  grade: string;
  targetProgram: string;
  preferredLanguage: SpokenLanguage;
  notes: string;
  status: 'active' | 'archived';
  parents?: Parent[];
}

export interface Admission {
  id: string;
  studentName: string;
  parentName: string;
  program: string;
  intake: string;
  stage: AdmissionStage;
  status: 'open' | 'closed';
  notes: string;
  student?: Pick<Student, 'id' | 'fullName' | 'grade' | 'preferredLanguage' | 'targetProgram'> | string;
  appliedAt?: string;
}

export interface Session {
  id: string;
  title: string;
  language: SpokenLanguage;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  durationSeconds: number;
  processingError: string;
  notes: string;
  studentName: string;
  parentName: string;
  student?: Student | string;
  parents?: Parent[];
  admission?: Admission | string | null;
}

export interface AudioMeta {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  createdAt: string;
}

export interface TranscriptSegment {
  speaker: string;
  startMs: number;
  endMs: number;
  text: string;
  language: SpokenLanguage;
}

export interface Transcript {
  id: string;
  language: SpokenLanguage;
  detectedLanguage: string;
  text: string;
  segments: TranscriptSegment[];
  provider: string;
  source?: 'audio' | 'text';
  isPlaceholder: boolean;
  placeholderMessage: string;
}

export interface Analysis {
  id: string;
  provider: string;
  model: string;
  isPlaceholder: boolean;
  summary: string;
  language: SpokenLanguage;
  topics: string[];
  parentConcerns: Array<{ concern: string; severity: Priority }>;
  studentIntent: { summary: string; signals: string[] };
  objections: Array<{ objection: string; status: 'open' | 'addressed' }>;
  sentimentIndicators: Array<{ aspect: string; indicator: string; intensity: Priority }>;
  unansweredQuestions: string[];
  counsellorStrengths: string[];
  counsellorImprovements: string[];
  missedOpportunities: string[];
  recommendations: string[];
  followUpActions: Array<{ action: string; priority: Priority; suggestedOwner: 'counsellor' | 'student' | 'parent' }>;
  requiredPoints?: string[];
  coveredPoints?: Array<{ point: string; evidence: string }>;
  missedPoints?: Array<{ point: string; lossReason: string }>;
  businessLoss?: string;
}

export interface FollowUp {
  id: string;
  action: string;
  priority: Priority;
  status: 'open' | 'done' | 'dismissed';
  source: 'ai' | 'manual';
  suggestedOwner: 'counsellor' | 'student' | 'parent';
  dueAt?: string | null;
  studentName?: string;
  student?: Pick<Student, 'id' | 'fullName' | 'grade' | 'preferredLanguage'> | string;
  session?: Pick<Session, 'id' | 'title' | 'language' | 'status'> | string | null;
}

export interface SessionBundle {
  session: Session;
  audio: AudioMeta | null;
  transcript: Transcript | null;
  analysis: Analysis | null;
  followUps: FollowUp[];
}

export interface AnalyticsOverview {
  counts: {
    students: number;
    parents: number;
    admissions: number;
    sessions: number;
    openFollowUps: number;
    completedSessions: number;
  };
  sessionsByStatus: Record<string, number>;
  sessionsByLanguage: Record<string, number>;
  admissionsByStage: Record<string, number>;
  recentSessions: Session[];
  followUpsDue: FollowUp[];
  ai: {
    configured: boolean;
    placeholderAnalyses: number;
    realAnalyses: number;
  };
}

export interface CoveragePoint {
  id: string;
  text: string;
  order: number;
  active: boolean;
}

export interface AuthPayload {
  token: string;
  user: User;
  counsellor: Counsellor | null;
}
