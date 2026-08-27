/**
 * Response contract for GET /api/evaluation-criteria/.
 * Mirrors backend/reviews/serializers.py.
 *
 * These types exist so the marking scheme is described once on the wire and
 * checked by the compiler here, rather than re-declared as literals in Angular
 * where it could silently drift from the backend definition.
 */

/** A grade letter, from the backend grade bands. */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface EvaluationCategoryCriterion {
  readonly key: string;
  readonly name: string;
  readonly maxScore: number;
  readonly description: string;
}

export interface GradeBand {
  readonly grade: Grade;
  readonly band: string;
  readonly minScore: number;
  readonly maxScore: number;
  readonly meaning: string;
}

export interface SupportedLanguage {
  readonly key: string;
  readonly label: string;
}

export interface MarkingScheme {
  readonly version: string;
  readonly maxScore: number;
  readonly categories: readonly EvaluationCategoryCriterion[];
  readonly gradeBands: readonly GradeBand[];
  /** Languages the backend will accept, served alongside the criteria. */
  readonly languages: readonly SupportedLanguage[];
}
