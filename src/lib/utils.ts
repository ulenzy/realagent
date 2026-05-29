import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatCurrency } from './format';

export { formatCurrency };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('en-NG').format(num);
}

export function formatNumberString(value: string) {
  if (!value) return '';
  const cleanValue = value.replace(/,/g, '');
  if (isNaN(Number(cleanValue))) return value;
  return new Intl.NumberFormat('en-US').format(Number(cleanValue));
}

export function parseFormattedNumber(value: string) {
  return value.replace(/,/g, '');
}
