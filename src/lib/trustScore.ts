export type TrustScoreEvent =
  | 'deal_closed'
  | 'inspection_completed'
  | 'bid_accepted'
  | 'buyer_rated_5star'
  | 'buyer_rated_1star'
  | 'dispute_lost'
  | 'dispute_won'
  | 'response_under_1hr'
  | 'off_platform_confirmed'
  | 'off_platform_deal_reported';

export function calculateTrustScoreDelta(event: TrustScoreEvent): number {
  switch (event) {
    case 'deal_closed':
      return 15;
    case 'inspection_completed':
      return 8;
    case 'bid_accepted':
      return 3;
    case 'buyer_rated_5star':
      return 10;
    case 'buyer_rated_1star':
      return -8;
    case 'dispute_lost':
      return -20;
    case 'dispute_won':
      return 5;
    case 'response_under_1hr':
      return 2;
    case 'off_platform_confirmed':
      return -50;
    case 'off_platform_deal_reported':
      return -30;
    default:
      return 0;
  }
}
