'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchExpenses, fetchCategories } from '@/lib/api';
import { Expense, Category, SpendType } from '@/types';
import { formatCurrency, getDateRange } from '@/lib/utils';
import { SPEND_TYPE_CONFIG, SPEND_TYPE_ORDER } from '@/lib/categories';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';

const PERIOD_OPTIONS = [
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'week', label: 'This Week' },
];

export default function AnalyticsPage() {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<SpendType[]>([]);
  const [excludedCatIds, setExcludedCatIds] = useState<string[]>([]);
  const [selectedPaidBy, setSelectedPaidBy] = useState<'all' | 'husband' | 'wife'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = getDateRange(period);
      const [data, cats] = await Promise.all([
        fetchExpenses({ from: range.from, to: range.to }),
        fetchCategories(),
      ]);
      setAllExpenses(data);
      setCategories(cats);
    } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Apply filters
  const expenses = useMemo(() => {
    let e = allExpenses;
    if (selectedTags.length > 0) e = e.filter(x => selectedTags.includes(x.spend_type));
    if (excludedCatIds.length > 0) e = e.filter(x => !excludedCatIds.includes(x.category_id));
    if (selectedPaidBy !== 'all') e = e.filter(x => x.paid_by === selectedPaidBy);
    return e;
  }, [allExpenses, selectedTags, excludedCatIds, selectedPaidBy]);

  const hasFilters = selectedTags.length > 0 || excludedCatIds.length > 0 || selectedPaidBy !== 'all';

  const toggleTag = (t: SpendType) =>
    setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleExcludeCat = (id: string) =>
    setExcludedCatIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // ── Stats ──────────────────────────────────────────────────
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const txCount = expenses.length;

  // Spend-type breakdown with count
  const tagBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    expenses.forEach(e => {
      if (!map[e.spend_type]) map[e.spend_type] = { amount: 0, count: 0 };
      map[e.spend_type].amount += Number(e.amount);
      map[e.spend_type].count += 1;
    });
    return map;
  }, [expenses]);

  // Category breakdown with count and amount
  const catBreakdown = useMemo(() => {
    const map: Record<string, { name: string; icon: string; color: string; amount: number; count: number }> = {};
    expenses.forEach(e => {
      const id = e.category_id;
      if (!map[id]) {
        map[id] = {
          name: e.category?.name || 'Unknown',
          icon: e.category?.icon || '📦',
          color: e.category?.color || '#6B7280',
          amount: 0,
          count: 0,
        };
      }
      map[id].amount += Number(e.amount);
      map[id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const topCategory = catBreakdown[0];

  // Daily trend for the selected period
  const range = getDateRange(period);
  const days = eachDayOfInterval({ start: new Date(range.from), end: new Date(range.to) });
  const dailyMap: Record<string, number> = {};
  expenses.forEach(e => {
    const d = e.expense_date || e.created_at?.slice(0, 10);
    if (d) dailyMap[d] = (dailyMap[d] || 0) + Number(e.amount);
  });
  const trendData = days.map(d => ({
    date: format(d, 'MMM dd'),
    key: format(d, 'yyyy-MM-dd'),
    amount: 0,
  })).map(d => ({ ...d, amount: dailyMap[d.key] || 0 }));

  // Person split
  const husbandTotal = expenses.filter(e => e.paid_by === 'husband').reduce((s, e) => s + Number(e.amount), 0);
  const wifeTotal = expenses.filter(e => e.paid_by === 'wife').reduce((s, e) => s + Number(e.amount), 0);
  const personData = [
    { name: 'Husband', amount: husbandTotal, fill: 'var(--husband)' },
    { name: 'Wife', amount: wifeTotal, fill: 'var(--wife)' },
  ];

  if (loading) {
    return (
      <div className="px-4 pt-4 py-5 space-y-4">
        <div className="h-8 w-32 bg-[var(--muted)] rounded-xl animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-[var(--muted)] rounded-3xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Analytics</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all',
            showFilters || hasFilters
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
          )}
        >
          {hasFilters ? <X size={13} /> : <SlidersHorizontal size={13} />}
          {hasFilters ? 'Filtered' : 'Filter'}
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {PERIOD_OPTIONS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={cn(
              'flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all',
              period === p.id ? 'bg-[var(--primary)] text-white shadow-sm' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
            )}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 mb-4 space-y-4 animate-slide-up">
          {/* Tag filter */}
          <div>
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
              Include tags (empty = all)
            </p>
            <div className="flex flex-wrap gap-2">
              {SPEND_TYPE_ORDER.map(t => {
                const cfg = SPEND_TYPE_CONFIG[t];
                const active = selectedTags.includes(t);
                return (
                  <button key={t} onClick={() => toggleTag(t)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                      active ? 'text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    )}
                    style={active ? { backgroundColor: cfg.color } : {}}>
                    {cfg.icon} {cfg.label}
                    {active && <span className="text-white/80">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exclude categories */}
          <div>
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
              Exclude categories
            </p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {categories.map(c => {
                const excluded = excludedCatIds.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleExcludeCat(c.id)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                      excluded
                        ? 'bg-red-500 text-white line-through'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    )}>
                    {c.icon} {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid by */}
          <div>
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Paid by</p>
            <div className="flex gap-2">
              {(['all', 'husband', 'wife'] as const).map(p => (
                <button key={p} onClick={() => setSelectedPaidBy(p)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all',
                    selectedPaidBy === p ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  )}>
                  {p === 'all' ? 'Both' : p}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { setSelectedTags([]); setExcludedCatIds([]); setSelectedPaidBy('all'); }}
            className="text-xs text-[var(--primary)] font-semibold">
            Clear all filters
          </button>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <p className="text-4xl mb-2">📊</p>
          <p className="font-medium">No data for this period</p>
          {hasFilters && <p className="text-sm mt-1">Try adjusting your filters</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-bold text-[var(--foreground)]">{formatCurrency(total)}</p>
            </div>
            <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Transactions</p>
              <p className="text-xl font-bold text-[var(--foreground)]">{txCount}</p>
            </div>
            <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Top Category</p>
              <p className="text-sm font-bold text-[var(--foreground)] truncate">
                {topCategory ? `${topCategory.icon} ${topCategory.name}` : '—'}
              </p>
              {topCategory && (
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {topCategory.count} {topCategory.count === 1 ? 'time' : 'times'}
                </p>
              )}
            </div>
            <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Avg / Day</p>
              <p className="text-xl font-bold text-[var(--foreground)]">
                {formatCurrency(total / Math.max(days.length, 1))}
              </p>
            </div>
          </div>

          {/* Tag breakdown with counts — updates with period & filters */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
            <p className="text-sm font-bold text-[var(--foreground)] mb-3">By Tag</p>
            <div className="space-y-2.5">
              {SPEND_TYPE_ORDER.map(t => {
                const cfg = SPEND_TYPE_CONFIG[t];
                const data = tagBreakdown[t];
                if (!data) return null;
                const pct = total > 0 ? (data.amount / total) * 100 : 0;
                return (
                  <div key={t}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cfg.icon}</span>
                        <span className="text-sm font-semibold text-[var(--foreground)]">{cfg.label}</span>
                        <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-lg">
                          {data.count}×
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(data.amount)}</span>
                        <span className="text-xs text-[var(--muted-foreground)] ml-2">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category breakdown with count */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
            <p className="text-sm font-bold text-[var(--foreground)] mb-3">By Category</p>
            <div className="space-y-3">
              {catBreakdown.map((c, i) => {
                const pct = total > 0 ? (c.amount / total) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: c.color + '20' }}>
                        {c.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--foreground)] truncate">{c.name}</span>
                          <span className="text-xs font-bold text-[var(--foreground)] ml-2 flex-shrink-0">
                            {formatCurrency(c.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            {c.count} {c.count === 1 ? 'transaction' : 'transactions'}
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-1 bg-[var(--muted)] rounded-full overflow-hidden ml-11">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Pie */}
          <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)]">
            <p className="text-sm font-bold text-[var(--foreground)] mb-3">Category Distribution</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={catBreakdown} dataKey="amount" nameKey="name"
                  cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                  {catBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Daily trend */}
          <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)]">
            <p className="text-sm font-bold text-[var(--foreground)] mb-3">Daily Trend</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', fontSize: '12px' }} />
                <Line type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Person split */}
          <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)]">
            <p className="text-sm font-bold text-[var(--foreground)] mb-3">Husband vs Wife</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={personData} barSize={48}>
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', fontSize: '12px' }} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {personData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--foreground)' }} tickLine={false} axisLine={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
