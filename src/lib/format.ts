export const USD_RATE = 0.00065;
export const GBP_RATE = 0.00051;

export function formatCurrency(amount: number, currency?: 'NGN' | 'USD' | 'GBP'): string {
  const activeCurrency = currency || 'NGN';
  
  if (activeCurrency === 'USD') {
    const converted = amount * USD_RATE;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(converted);
  } else if (activeCurrency === 'GBP') {
    const converted = amount * GBP_RATE;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(converted);
  } else {
    // Default to NGN
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('NGN', '₦');
  }
}
