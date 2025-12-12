import { ValueObject } from '../../../common/domain/aggregate-root.interface';

/**
 * SprintCapacity Value Object
 *
 * Represents the total story points that can be completed in a sprint.
 *
 * Rules:
 * - Capacity must be positive (> 0)
 * - Capacity is immutable after creation
 * - Typical values: 20, 30, 40 story points per sprint
 *
 * Example:
 * ```typescript
 * const capacity = new SprintCapacity(40);
 * capacity.getValue(); // 40
 * capacity.isReasonable(); // true if between 20 and 100
 * capacity.equals(new SprintCapacity(40)); // true
 * ```
 */
export class SprintCapacity implements ValueObject<number> {
  private readonly value: number;

  private static readonly MIN_CAPACITY = 1;
  private static readonly MAX_CAPACITY = 1000;
  private static readonly REASONABLE_MIN = 20;
  private static readonly REASONABLE_MAX = 100;

  constructor(value: number) {
    this.validateCapacity(value);
    this.value = value;
  }

  private validateCapacity(value: number): void {
    if (!Number.isInteger(value)) {
      throw new Error('Sprint capacity must be an integer');
    }

    if (value < SprintCapacity.MIN_CAPACITY) {
      throw new Error(
        `Sprint capacity must be at least ${SprintCapacity.MIN_CAPACITY}`,
      );
    }

    if (value > SprintCapacity.MAX_CAPACITY) {
      throw new Error(
        `Sprint capacity cannot exceed ${SprintCapacity.MAX_CAPACITY}`,
      );
    }
  }

  /**
   * Get the numeric capacity value.
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Check if this capacity is within recommended range (20-100 points).
   */
  isReasonable(): boolean {
    return (
      this.value >= SprintCapacity.REASONABLE_MIN &&
      this.value <= SprintCapacity.REASONABLE_MAX
    );
  }

  /**
   * Get recommendation if capacity is not reasonable.
   */
  getRecommendation(): string | null {
    if (this.value < SprintCapacity.REASONABLE_MIN) {
      return `Capacity ${this.value} is low. Consider at least ${SprintCapacity.REASONABLE_MIN} points.`;
    }
    if (this.value > SprintCapacity.REASONABLE_MAX) {
      return `Capacity ${this.value} is high. Consider limiting to ${SprintCapacity.REASONABLE_MAX} points for better focus.`;
    }
    return null;
  }

  /**
   * Check equality by value.
   */
  equals(other: ValueObject<number>): boolean {
    if (!(other instanceof SprintCapacity)) {
      return false;
    }
    return this.value === other.getValue();
  }

  /**
   * Convert to JSON for serialization.
   */
  toJSON(): number {
    return this.value;
  }

  /**
   * String representation.
   */
  toString(): string {
    return `SprintCapacity(${this.value} points)`;
  }
}
