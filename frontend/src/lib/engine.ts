/**
 * Presentation helpers for psychometric values.
 *
 * The engine itself — signal weighting, score blending, tag thresholds, IRT —
 * runs on the server in difficulty_tagging.py / scoring.py, and the API returns
 * its output. This file used to carry a hand-ported JS copy of that maths; it
 * drifted from the Python (different MIN_ATTEMPTS, different handling of a
 * missing student signal), which is exactly why the duplication is gone. What
 * remains here only turns numbers the server already computed into words and
 * chart points.
 */

import type { IRTParams, QualityFlag } from '@/types';

/** Minimum responses before an IRT fit is attempted (difficulty_tagging.MIN_IRT_RESPONSES). */
export const MIN_ATTEMPTS = 30;
/** Discrimination below this reads as a poor discriminator (POOR_DISCRIMINATION_A). */
export const DISCRIMINATION_FLOOR = 0.5;

/** 3PL Item Characteristic Curve: P(θ) = c + (1−c)/(1+e^(−a(θ−b))). */
export function icc(theta: number, { a, b, c }: IRTParams): number {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

export type Tone = 'critical' | 'serious' | 'neutral' | 'good';

export interface Band {
  key: string;
  label: string;
  tone: Tone;
}

/** Interpret the IRT a (discrimination) parameter. */
export function discriminationBand(a: number | null | undefined): Band | null {
  if (a == null) return null;
  if (a < 0) return { key: 'negative', label: 'Negative, potentially flawed', tone: 'critical' };
  if (a < DISCRIMINATION_FLOOR) return { key: 'poor', label: 'Poor discriminator', tone: 'serious' };
  if (a < 1.0) return { key: 'acceptable', label: 'Acceptable', tone: 'neutral' };
  if (a < 2.0) return { key: 'good', label: 'Good', tone: 'good' };
  return { key: 'excellent', label: 'Excellent', tone: 'good' };
}

/** Interpret the IRT b (difficulty) parameter. */
export function bBand(b: number | null | undefined): string | null {
  if (b == null) return null;
  if (b < -0.5) return 'Easy: even below-average students get it right';
  if (b <= 0.5) return 'Medium: average students have ~50% chance';
  return 'Hard: only above-average students consistently succeed';
}

export type { QualityFlag };

/**
 * Quality flags for a question.
 *
 * The analytics endpoints return server-computed `flags`; prefer those. This is
 * the fallback for list payloads, which carry the raw fields but not the flags,
 * and it reads the same `discriminationStatus` the server derived from
 * check_discrimination() rather than re-deriving thresholds here.
 */
export function qualityFlags(
  discriminationStatus: string | null | undefined,
  attemptCount: number,
  contradiction: boolean,
  nonfunctionalDistractors?: number | null,
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  if (contradiction) {
    flags.push({
      key: 'contradiction',
      tone: 'warning',
      label: 'Signal contradiction',
      detail:
        'Faculty and AI difficulty estimates disagree significantly before student data has stabilised. Review the AI reasoning.',
    });
  }
  // Every response-derived flag needs a real sample behind it — below the
  // floor, both discrimination and distractor statistics are noise.
  if (attemptCount >= MIN_ATTEMPTS) {
    if (discriminationStatus === 'negative') {
      flags.push({
        key: 'negative-discrimination',
        tone: 'critical',
        label: 'Negative discrimination',
        detail:
          'Weaker students outperform stronger ones on this item, which usually means an answer-key error or a trick element. Recommended for review or retirement.',
      });
    } else if (discriminationStatus === 'poor') {
      flags.push({
        key: 'poor-discriminator',
        tone: 'serious',
        label: 'Poor discriminator',
        detail:
          `The item does not effectively separate strong students from weak ones (a < ${DISCRIMINATION_FLOOR}). The difficulty tag is unaffected, but the item is not doing its job as an assessment tool.`,
      });
    }
    if (nonfunctionalDistractors != null && nonfunctionalDistractors >= 2) {
      flags.push({
        key: 'nonfunctional-distractors',
        tone: 'serious',
        label: 'Non-functional distractors',
        detail:
          `${nonfunctionalDistractors} distractors were chosen by under 5% of students, so the item effectively offers fewer real choices.`,
      });
    }
  }
  return flags;
}
