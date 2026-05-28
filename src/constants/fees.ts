import { TokenBundle } from '../types';

export const VERIFICATION_FEE_NAIRA = 20000;
export const VERIFICATION_FEE_TOKENS = null; // verification is Naira-only — no token equivalent
export const MONTHLY_FEE_NAIRA = 3690;
export const MONTHLY_FEE_TOKENS = 200;
export const TOKEN_NAIRA_RATE = 18.45; // ₦3,690 / 200 = ₦18.45 per token

export const TOKEN_BUNDLES: TokenBundle[] = [
  { id: 'bundle-200', tokens: 200, priceNaira: 3690, label: '200 Tokens' },
  { id: 'bundle-500', tokens: 500, priceNaira: 9000, label: '500 Tokens', popular: true },
  { id: 'bundle-1000', tokens: 1000, priceNaira: 17000, label: '1,000 Tokens' },
  { id: 'bundle-2000', tokens: 2000, priceNaira: 32000, label: '2,000 Tokens' }
];
