import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../format';

describe('formatCurrency', () => {
  it('should format zero correctly', () => {
    // Standard locale formatting
    const formatted = formatCurrency(0);
    expect(formatted).toContain('0');
  });

  it('should format negative numbers correctly', () => {
    const formatted = formatCurrency(-500);
    expect(formatted).toContain('500');
    expect(formatted).toContain('-');
  });

  it('should format very large numbers (> 1 trillion) correctly', () => {
    const formatted = formatCurrency(1500000000000);
    expect(formatted).toContain('1,500,000,000,000');
  });

  it('should handle non-numeric inputs gracefully without throwing', () => {
    // Casting string/NaN as number to check resilience
    expect(() => formatCurrency('hello' as any)).not.toThrow();
    expect(() => formatCurrency(NaN)).not.toThrow();
    expect(() => formatCurrency(undefined as any)).not.toThrow();
  });

  it('should support USD conversions', () => {
    const formatted = formatCurrency(1000, 'USD');
    expect(formatted).toContain('$');
  });

  it('should support GBP conversions', () => {
    const formatted = formatCurrency(1000, 'GBP');
    expect(formatted).toContain('£');
  });
});
