export type UUID = string;
export type ISODateTime = string;

export type CategoryId = "strategy" | "tactics" | "promotion" | "experience" | "philosophy";
export type Importance = "high" | "medium" | "low";
export type SessionStatus = "in_progress" | "completed";
export type SummaryCategoryId = CategoryId | "all";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

export interface QuestionBankItem {
  id: string;
  category: CategoryId;
  theme: string;
  subTheme: string;
  importance: Importance;
  level1: string;
  level2: string;
  level3: string;
  aiSummary: string;
  framework: string[];
  pdfOutput: string;
  nextQuestion: string[];
  tags: string[];
  weight: number;
}

export interface QuestionBankChapter {
  category: Category;
  order: number;
  questions: QuestionBankItem[];
}

export interface QuestionBank {
  title: string;
  version: string;
  chapters: QuestionBankChapter[];
}

export interface AnswerDraft {
  questionId: string;
  answerText: string;
  aiDeepPrompt?: string;
  updatedAt: ISODateTime;
}

export interface LocalSessionState {
  id: UUID;
  title: string;
  status: SessionStatus;
  currentChapter: CategoryId;
  currentQuestionId: string;
  answers: Record<string, AnswerDraft>;
  summaries: Record<SummaryCategoryId, string>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface UserRow {
  id: UUID;
  email: string;
  name: string;
  created_at: ISODateTime;
}

export interface CompanyRow {
  id: UUID;
  user_id: UUID;
  name: string;
  industry: string | null;
  created_at: ISODateTime;
}

export interface SessionRow {
  id: UUID;
  user_id: UUID;
  company_id: UUID;
  title: string;
  status: SessionStatus;
  current_chapter: CategoryId | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CategoryRow {
  id: CategoryId;
  name: string;
  order_num: number;
}

export interface QuestionRow {
  id: string;
  category_id: CategoryId;
  level1_text: string;
  level2_text: string | null;
  next_question_id: string | null;
  pdf_output_key: string;
}

export interface AnswerRow {
  id: UUID;
  session_id: UUID;
  question_id: string;
  answer_text: string;
  ai_deep_prompt: string | null;
  created_at: ISODateTime;
}

export interface AiSummaryRow {
  id: UUID;
  session_id: UUID;
  category_id: SummaryCategoryId;
  summary_text: string;
  action_plan: string | null;
}

export interface PdfExportRow {
  id: UUID;
  session_id: UUID;
  file_url: string;
  created_at: ISODateTime;
}

export interface PromptSettingRow {
  id: string;
  content: string;
}
