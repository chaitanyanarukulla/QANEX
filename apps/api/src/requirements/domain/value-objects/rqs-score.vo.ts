import { ValueObject } from '../../../common/domain/aggregate-root.interface';

/**
 * RQS Score Value Object
 *
 * Represents the Requirement Quality Score (RQS) - an AI-generated assessment of a requirement's quality.
 *
 * The RQS score is calculated across 5 dimensions:
 * - **Score**: Overall quality (0-100)
 * - **Clarity**: How clear and understandable the requirement is (0-100)
 * - **Completeness**: Whether all necessary details are included (0-100)
 * - **Testability**: How easily the requirement can be verified/tested (0-100)
 * - **Consistency**: Internal consistency and absence of contradictions (0-100)
 *
 * Example:
 * ```typescript
 * const score = new RQSScore(85, 90, 80, 75, 85, ['Add examples']);
 * score.isHighQuality(); // true (score >= 80)
 * score.getWeakestDimension(); // { name: 'testability', score: 75 }
 * ```
 *
 * Value objects are:
 * - **Immutable**: Cannot be changed after creation
 * - **Identity-less**: Compared by value, not reference
 * - **Self-validating**: Constructor validates constraints
 */
export class RQSScore implements ValueObject<RQSScore> {
  private readonly score: number;
  private readonly clarity: number;
  private readonly completeness: number;
  private readonly testability: number;
  private readonly consistency: number;
  private readonly feedback: string[];

  // Constants for score thresholds
  private static readonly SCORE_MIN = 0;
  private static readonly SCORE_MAX = 100;
  private static readonly HIGH_QUALITY_THRESHOLD = 80;
  private static readonly MEDIUM_QUALITY_THRESHOLD = 60;

  /**
   * Create a new RQS Score value object.
   *
   * @param score Overall quality score (0-100)
   * @param clarity Clarity dimension (0-100)
   * @param completeness Completeness dimension (0-100)
   * @param testability Testability dimension (0-100)
   * @param consistency Consistency dimension (0-100)
   * @param feedback Array of improvement suggestions (optional)
   * @throws Error if any score is outside valid range [0, 100]
   */
  constructor(
    score: number,
    clarity: number,
    completeness: number,
    testability: number,
    consistency: number,
    feedback: string[] = [],
  ) {
    // Validate all scores are in valid range
    this.validateScore('overall score', score);
    this.validateScore('clarity', clarity);
    this.validateScore('completeness', completeness);
    this.validateScore('testability', testability);
    this.validateScore('consistency', consistency);

    this.score = score;
    this.clarity = clarity;
    this.completeness = completeness;
    this.testability = testability;
    this.consistency = consistency;
    this.feedback = feedback || [];
  }

  /**
   * Validate that a score is within the acceptable range.
   * @throws Error if score is outside [0, 100]
   */
  private validateScore(name: string, value: number): void {
    if (value < RQSScore.SCORE_MIN || value > RQSScore.SCORE_MAX) {
      throw new Error(
        `Invalid ${name}: ${value}. Must be between ${RQSScore.SCORE_MIN} and ${RQSScore.SCORE_MAX}`,
      );
    }
  }

  /**
   * Get the overall quality score.
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Get the clarity dimension score.
   */
  getClarity(): number {
    return this.clarity;
  }

  /**
   * Get the completeness dimension score.
   */
  getCompleteness(): number {
    return this.completeness;
  }

  /**
   * Get the testability dimension score.
   */
  getTestability(): number {
    return this.testability;
  }

  /**
   * Get the consistency dimension score.
   */
  getConsistency(): number {
    return this.consistency;
  }

  /**
   * Get improvement feedback suggestions.
   */
  getFeedback(): string[] {
    return [...this.feedback]; // Return copy to prevent external mutation
  }

  /**
   * Check if this requirement has high quality (score >= 80).
   *
   * High quality requirements:
   * - Are clear and easy to understand
   * - Have all necessary details
   * - Can be objectively tested
   * - Are internally consistent
   */
  isHighQuality(): boolean {
    return this.score >= RQSScore.HIGH_QUALITY_THRESHOLD;
  }

  /**
   * Check if this requirement has medium quality (score >= 60).
   */
  isMediumQuality(): boolean {
    return this.score >= RQSScore.MEDIUM_QUALITY_THRESHOLD;
  }

  /**
   * Check if this requirement has low quality (score < 60).
   * Such requirements should be revised before implementation.
   */
  isLowQuality(): boolean {
    return this.score < RQSScore.MEDIUM_QUALITY_THRESHOLD;
  }

  /**
   * Find the weakest dimension in this RQS assessment.
   * Useful for identifying which aspect of the requirement needs improvement.
   *
   * @returns Object with dimension name and its score, or null if all dimensions equal
   */
  getWeakestDimension(): { name: string; score: number } | null {
    const dimensions = [
      { name: 'clarity', score: this.clarity },
      { name: 'completeness', score: this.completeness },
      { name: 'testability', score: this.testability },
      { name: 'consistency', score: this.consistency },
    ];

    const weakest = dimensions.reduce((prev, curr) =>
      curr.score < prev.score ? curr : prev,
    );

    // Return null if all dimensions are equal
    const allEqual = dimensions.every((d) => d.score === weakest.score);
    return allEqual ? null : weakest;
  }

  /**
   * Get the strongest dimension in this RQS assessment.
   *
   * @returns Object with dimension name and its score, or null if all dimensions equal
   */
  getStrongestDimension(): { name: string; score: number } | null {
    const dimensions = [
      { name: 'clarity', score: this.clarity },
      { name: 'completeness', score: this.completeness },
      { name: 'testability', score: this.testability },
      { name: 'consistency', score: this.consistency },
    ];

    const strongest = dimensions.reduce((prev, curr) =>
      curr.score > prev.score ? curr : prev,
    );

    // Return null if all dimensions are equal
    const allEqual = dimensions.every((d) => d.score === strongest.score);
    return allEqual ? null : strongest;
  }

  /**
   * Calculate the average score across all dimensions (excluding overall score).
   */
  getAverageDimensionScore(): number {
    const sum =
      this.clarity +
      this.completeness +
      this.testability +
      this.consistency;
    return Math.round(sum / 4);
  }

  /**
   * Get the value of this value object.
   * Returns the complete RQS data structure.
   */
  getValue(): RQSScore {
    return this;
  }

  /**
   * Check equality by comparing all fields.
   * Two RQS scores are equal if all dimensions and feedback are identical.
   */
  equals(other: ValueObject<RQSScore>): boolean {
    if (!(other instanceof RQSScore)) {
      return false;
    }

    return (
      this.score === other.score &&
      this.clarity === other.clarity &&
      this.completeness === other.completeness &&
      this.testability === other.testability &&
      this.consistency === other.consistency &&
      this.feedback.length === other.feedback.length &&
      this.feedback.every(
        (f, i) => f === (other as any).feedback[i],
      )
    );
  }

  /**
   * Convert to a plain object for serialization/storage.
   */
  toJSON() {
    return {
      score: this.score,
      clarity: this.clarity,
      completeness: this.completeness,
      testability: this.testability,
      consistency: this.consistency,
      feedback: this.feedback,
    };
  }

  /**
   * Create an RQS Score from a plain object.
   * Useful for deserialization from database or API responses.
   */
  static fromJSON(data: {
    score: number;
    clarity: number;
    completeness: number;
    testability: number;
    consistency: number;
    feedback?: string[];
  }): RQSScore {
    return new RQSScore(
      data.score,
      data.clarity,
      data.completeness,
      data.testability,
      data.consistency,
      data.feedback,
    );
  }
}
