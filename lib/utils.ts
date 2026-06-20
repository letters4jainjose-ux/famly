import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy');
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a');
}

export function formatShortDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM');
}

export function formatInputDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayInputDate(): string {
  return formatInputDate(new Date());
}

export function getDateRange(filter: string): { from: string; to: string } {
  const now = new Date();
  switch (filter) {
    case 'today':     return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case 'week':      return { from: startOfWeek(now,{weekStartsOn:1}).toISOString(), to: endOfWeek(now,{weekStartsOn:1}).toISOString() };
    case 'month':     return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
    case 'lastMonth': {
      const l = subMonths(now,1);
      return { from: startOfMonth(l).toISOString(), to: endOfMonth(l).toISOString() };
    }
    default: return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
  }
}

export function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

export function isYesterday(dateStr: string): boolean {
  const y = new Date(); y.setDate(y.getDate()-1);
  return new Date(dateStr).toDateString() === y.toDateString();
}

export function getDisplayDate(expense: { expense_date?: string; created_at: string }): string {
  const d = expense.expense_date || expense.created_at;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return formatShortDate(d);
}
