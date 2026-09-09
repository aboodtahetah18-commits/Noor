export type MoneyInput = string | bigint;

const MONEY_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;
const HUNDRED = 100n;

/**
 * Money is represented internally in Saudi halalas (1 SAR = 100 halalas).
 * JavaScript number is deliberately excluded from the public API to avoid
 * floating-point ambiguity in authoritative financial calculations.
 */
export class Money {
  private constructor(private readonly minorUnitsValue: bigint) {}

  static zero(): Money {
    return new Money(0n);
  }

  static fromMinorUnits(value: bigint): Money {
    return new Money(value);
  }

  /** Compatibility alias used by historical-analysis code. */
  static fromHalalas(value: bigint): Money {
    return Money.fromMinorUnits(value);
  }

  static parse(value: MoneyInput): Money {
    if (typeof value === 'bigint') return Money.fromMinorUnits(value);

    const normalized = value.trim();
    if (!MONEY_PATTERN.test(normalized)) {
      throw new Error(`Invalid monetary value: ${value}`);
    }

    const negative = normalized.startsWith('-');
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [wholePart = '0', fractionPart = ''] = unsigned.split('.');
    const minor = BigInt(wholePart) * HUNDRED + BigInt(fractionPart.padEnd(2, '0'));

    return new Money(negative ? -minor : minor);
  }

  get minorUnits(): bigint {
    return this.minorUnitsValue;
  }

  /** Compatibility alias: authoritative money is stored in halalas. */
  toHalalas(): bigint {
    return this.minorUnitsValue;
  }

  add(other: Money): Money {
    return new Money(this.minorUnitsValue + other.minorUnitsValue);
  }

  subtract(other: Money): Money {
    return new Money(this.minorUnitsValue - other.minorUnitsValue);
  }

  negate(): Money {
    return new Money(-this.minorUnitsValue);
  }

  abs(): Money {
    return this.minorUnitsValue < 0n ? this.negate() : this;
  }

  max(other: Money): Money {
    return this.minorUnitsValue >= other.minorUnitsValue ? this : other;
  }

  min(other: Money): Money {
    return this.minorUnitsValue <= other.minorUnitsValue ? this : other;
  }

  isNegative(): boolean {
    return this.minorUnitsValue < 0n;
  }

  isZero(): boolean {
    return this.minorUnitsValue === 0n;
  }

  isPositive(): boolean {
    return this.minorUnitsValue > 0n;
  }

  compare(other: Money): -1 | 0 | 1 {
    if (this.minorUnitsValue < other.minorUnitsValue) return -1;
    if (this.minorUnitsValue > other.minorUnitsValue) return 1;
    return 0;
  }

  toString(): string {
    const negative = this.minorUnitsValue < 0n;
    const absolute = negative ? -this.minorUnitsValue : this.minorUnitsValue;
    const whole = absolute / HUNDRED;
    const fraction = (absolute % HUNDRED).toString().padStart(2, '0');
    return `${negative ? '-' : ''}${whole}.${fraction}`;
  }

  toJSON(): string {
    return this.toString();
  }
}

export function sumMoney(values: readonly Money[]): Money {
  return values.reduce((sum, value) => sum.add(value), Money.zero());
}
