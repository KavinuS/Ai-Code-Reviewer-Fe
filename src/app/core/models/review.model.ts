/**
 * Request and response contracts for the review API.
 * Mirrors backend/reviews/serializers.py and backend/reviews/domain.py.
 *
 * The union types below are the same closed sets the backend enum-validates, so
 * a template that switches on a severity or issue type is exhaustively checked
 * by the compiler.
 */

export type IssueType =
  | 'BUG'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'CODE_QUALITY'
  | 'MAINTAINABILITY'
  | 'BEST_PRACTICE';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/** Whether the model could demonstrate the problem, or only suspects it. */
export type Confidence = 'CONFIRMED' | 'POSSIBLE';

export interface ReviewRequest {
  readonly language: string;
  readonly code: string;
  readonly filename?: string;
  readonly instructions?: string;
}

export interface ReviewIssue {
  readonly type: IssueType;
  readonly severity: Severity;
  readonly confidence: Confidence;
  /** Null when the model could not determine a line. Never guessed. */
  readonly line: number | null;
  readonly title: string;
  readonly description: string;
  readonly suggestion: string;
  /** Illustrative only. Rendered as text, never executed or injected as HTML. */
  readonly suggestedCode: string;
}

export interface EvaluationCategoryResult {
  readonly key: string;
  readonly name: string;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
  readonly strengths: readonly string[];
  readonly improvements: readonly string[];
}

export interface Evaluation {
  readonly totalScore: number;
  readonly maxScore: number;
  readonly grade: string;
  readonly band: string;
  readonly bandMeaning: string;
  readonly markingSchemeVersion: string;
  readonly categories: readonly EvaluationCategoryResult[];
  /** Plain-language arithmetic behind the total, shown under the score. */
  readonly calculationExplanation: string;
  /** Corrections the backend applied to AI-proposed scores, if any. */
  readonly adjustments: readonly string[];
}

export interface ReviewResult {
  /** Identity of the stored review. Empty when it was not persisted. */
  readonly id: string;
  readonly summary: string;
  readonly language: string;
  readonly filename: string;
  readonly cached: boolean;
  readonly score: number;
  readonly grade: string;
  readonly evaluationBand: string;
  readonly evaluation: Evaluation;
  readonly issues: readonly ReviewIssue[];
}

/** Display metadata for a severity. Text label included so colour is never the only signal. */
export const SEVERITY_LABELS: Readonly<Record<Severity, string>> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFO: 'Info',
};

export const ISSUE_TYPE_LABELS: Readonly<Record<IssueType, string>> = {
  BUG: 'Bug',
  SECURITY: 'Security',
  PERFORMANCE: 'Performance',
  CODE_QUALITY: 'Code Quality',
  MAINTAINABILITY: 'Maintainability',
  BEST_PRACTICE: 'Best Practice',
};

export const SEVERITY_ORDER: readonly Severity[] = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
];

/**
 * One row of the history list.
 *
 * Deliberately not a `ReviewResult`: the list endpoint returns a summary
 * projection without the categories, the issues or the submitted code. Typing
 * it as its own interface stops a component reaching for `evaluation` on a row
 * that never carried one.
 */
export interface ReviewHistoryItem {
  readonly id: string;
  readonly language: string;
  readonly filename: string;
  readonly summary: string;
  readonly score: number;
  readonly maxScore: number;
  readonly grade: string;
  readonly evaluationBand: string;
  readonly markingSchemeVersion: string;
  readonly issueCount: number;
  /** ISO 8601, UTC. */
  readonly createdAt: string;
}

/** DRF's PageNumberPagination envelope. */
export interface Paginated<T> {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: readonly T[];
}
