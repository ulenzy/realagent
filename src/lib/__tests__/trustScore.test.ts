import { describe, it, expect } from 'vitest';
import { calculateTrustScoreDelta } from '../trustScore';

describe('calculateTrustScoreDelta', () => {
  it('should return 15 for deal_closed', () => {
    expect(calculateTrustScoreDelta('deal_closed')).toBe(15);
  });

  it('should return 8 for inspection_completed', () => {
    expect(calculateTrustScoreDelta('inspection_completed')).toBe(8);
  });

  it('should return 3 for bid_accepted', () => {
    expect(calculateTrustScoreDelta('bid_accepted')).toBe(3);
  });

  it('should return 10 for buyer_rated_5star', () => {
    expect(calculateTrustScoreDelta('buyer_rated_5star')).toBe(10);
  });

  it('should return -8 for buyer_rated_1star', () => {
    expect(calculateTrustScoreDelta('buyer_rated_1star')).toBe(-8);
  });

  it('should return -20 for dispute_lost', () => {
    expect(calculateTrustScoreDelta('dispute_lost')).toBe(-20);
  });

  it('should return 5 for dispute_won', () => {
    expect(calculateTrustScoreDelta('dispute_won')).toBe(5);
  });

  it('should return 2 for response_under_1hr', () => {
    expect(calculateTrustScoreDelta('response_under_1hr')).toBe(2);
  });

  it('should return -50 for off_platform_confirmed', () => {
    expect(calculateTrustScoreDelta('off_platform_confirmed')).toBe(-50);
  });

  it('should return -30 for off_platform_deal_reported', () => {
    expect(calculateTrustScoreDelta('off_platform_deal_reported')).toBe(-30);
  });

  it('should return 0 for unexpected or default events', () => {
    expect(calculateTrustScoreDelta('random_event' as any)).toBe(0);
  });
});
