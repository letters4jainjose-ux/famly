import type { SpendType } from '@/types';

export const SPEND_TYPE_CONFIG: Record<SpendType, {
  label: string; icon: string; color: string; bg: string; desc: string;
}> = {
  need: {
    label: 'Need',
    icon: '✅',
    color: '#16A34A',
    bg: '#DCFCE7',
    desc: 'Essential & necessary',
  },
  want: {
    label: 'Want',
    icon: '⭐',
    color: '#D97706',
    bg: '#FEF3C7',
    desc: 'Nice to have',
  },
  luxury: {
    label: 'Luxury',
    icon: '💎',
    color: '#9333EA',
    bg: '#F3E8FF',
    desc: 'Splurge & indulgence',
  },
  money_lent: {
    label: 'Money Lent',
    icon: '🤝',
    color: '#2563EB',
    bg: '#DBEAFE',
    desc: 'Money given to someone',
  },
  investing: {
    label: 'Investing',
    icon: '📈',
    color: '#059669',
    bg: '#D1FAE5',
    desc: 'Savings, SIPs & investments',
  },
};

export const SPEND_TYPE_ORDER: SpendType[] = ['need', 'want', 'luxury', 'money_lent', 'investing'];

const FALLBACK_META: Record<string, { icon: string; color: string }> = {
  'Miscellaneous': { icon: '📦', color: '#6B7280' },
};

export function getCategoryMeta(name: string): { icon: string; color: string } {
  return FALLBACK_META[name] || { icon: '📦', color: '#6B7280' };
}

export const ICON_CHOICES: string[] = [
  '🛒','🍽️','🍵','☕','🍰','🏠','✨','💡','🧴','🛍️','👗','🚗','✈️',
  '💊','🏋️','🧘','📚','📈','📖','🎓','🎬','🎮','🎉','💎','🍷','🎁',
  '💅','💰','🛡️','🤝','📦','🚙','🔧','🧼','🏦','💳','📱','🐾','🎵',
  '🏥','🧾','⚡','💧','🌐','🎂','🧹','🧸','🚲','⛽',
];

export const COLOR_CHOICES: string[] = [
  '#16A34A','#F97316','#CA8A04','#92400E','#DB2777','#2563EB','#7C3AED',
  '#0891B2','#059669','#DC2626','#6366F1','#0EA5E9','#EF4444','#F43F5E',
  '#A855F7','#9333EA','#B91C1C','#EC4899','#374151','#475569','#6B7280',
];
