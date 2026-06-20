'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchAnalytics, fetchCategories } from '@/lib/api';
import { Expense, Category, SpendType } from '@/types';
import { formatCurrency, getDateRange, cn } from '@/lib/utils';
import { getCategoryMeta, SPEND_TYPE_CONFIG, SPEND_TYPE_ORDER } from '@/lib/categories';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { SlidersHorizontal, X, Search } from 'lucide-react';

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

  // Multi-select filters
  const [showFilters, setShowFilters] = useState(false);
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<string[]>([]);
  const [selectedSpendTypes, setSelectedSpendTypes] = useState<SpendType[]>([...SPEND_TYPE_ORDER]);
  const [paidByFilter, setPaidByFilter] = useState<('husband'|'wife')[]>(['husband', 'wife']);
  const [catFilterSearch, setCatFilterSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = getDateRange(period);
      const [data, cats] = await Promise.all([
        fetchAnalytics(range.from, range.to),
        fetchCategories(),
      ]);
      setAllExpenses(data);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Apply multi-select filters client-side (cheap — already loaded for the period)
  const expenses = useMemo(() => {
    return allExpenses.filter(e =>
      !excludedCategoryIds.includes(e.category_id) &&
      selectedSpendTypes.includes(e.spend_type) &&
      paidByFilter.includes(e.paid_by)
    );
  }, [allExpenses, excludedCategoryIds, selectedSpendTypes, paidByFilter]);

  const toggleSpendType = (t: SpendType) => {
    setSelectedSpendTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };
  const togglePaidBy = (p: 'husband'|'wife') => {
    setPaidByFilter(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };
  const toggleCategoryExcluded = (id: string) => {
    setExcludedCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const clearFilters = () => {
    setExcludedCategoryIds([]);
    setSelectedSpendTypes([...SPEND_TYPE_ORDER]);
    setPaidByFilter(['husband', 'wife']);
    setCatFilterSearch('');
  };

  const activeFilterCount = excludedCategoryIds.length
    + (SPEND_TYPE_ORDER.length - selectedSpendTypes.length)
    + (2 - paidByFilter.length);

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="h-8 w-32 bg-[var(--muted)] rounded-xl animate-pulse" />
        {[1,2,3,4].map(i => <div key={i} className="h-48 bg-[var(--muted)] rounded-3xl animate-pulse" />)}
      </div>
    );
  }

  // Compute stats
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const avgDay = total / Math.max(1, expenses.length > 0
    ? Math.ceil((new Date(expenses[expenses.length - 1]?.created_at || Date.now()).getTime() - new Date(expenses[0]?.created_at || Date.now()).getTime()) / 86400000) + 1
    : 1);

  // Category breakdown
  const catMap: Record<string, { name: string; amount: number; icon: string; color: string }> = {};
  expenses.forEach(e => {
    const id = e.category_id;
    if (!catMap[id]) {
      catMap[id] = {
        name: e.category?.name || 'Unknown',
        amount: 0,
        icon: e.category?.icon || getCategoryMeta(e.category?.name||"").icon,
        color: e.category?.color || getCategoryMeta(e.category?.name||"").color,
      };
    }
    catMap[id].amount += Number(e.amount);
  });
  const catData = Object.values(catMap).sort((a, b) => b.amount - a.amount);
  const topCategory = catData[0];

  // Daily trend
  const range = getDateRange(period);
  const days = eachDayOfInterval({
    start: new Date(range.from),
    end: new Date(range.to),
  });
  const dailyMap: Record<string, number> = {};
  expenses.forEach(e => {
    const d = format(parseISO(e.created_at), 'MMM dd');
    dailyMap[d] = (dailyMap[d] || 0) + Number(e.amount);
  });
  const trendData = days.map(d => ({
    date: format(d, 'MMM dd'),
    amount: dailyMap[format(d, 'MMM dd')] || 0,
  })).filter((_, i, arr) => arr.some(x => x.amount > 0) || i < 7);

  // Person data
  const husbandTotal = expenses.filter(e => e.paid_by === 'husband').reduce((s, e) => s + Number(e.amount), 0);
  const wifeTotal = expenses.filter(e => e.paid_by === 'wife').reduce((s, e) => s + Number(e.amount), 0);
  const personData = [
    { name: 'Husband', amount: husbandTotal, fill: 'var(--husband)' },
    { name: 'Wife', amount: wifeTotal, fill: 'var(--wife)' },
  ];

  const filteredCategoryList = catFilterSearch.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(catFilterSearch.trim().toLowerCase()))
    : categories;

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Analytics</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all',
            activeFilterCount > 0 || showFilters
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
          )}
        >
          {activeFilterCount > 0 ? <X size={14} /> : <SlidersHorizontal size={14} />}
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {PERIOD_OPTIONS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              'flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all',
              period === p.id
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Multi-select filter panel */}
      {showFilters && (
        <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-4 mb-4 animate-slide-up space-y-4">
          {/* Spend type multi-select */}
          <div>
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Tags</p>
            <div className="flex gap-2 flex-wrap">
              {SPEND_TYPE_ORDER.map(t => {
                const cfg = SPEND_TYPE_CONFIG[t];
                const active = selectedSpendTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleSpendType(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                      active ? 'text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] opacity-50'
                    )}
                    style={active ? { backgroundColor: cfg.color } : {}}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid by multi-select */}
          <div>
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Paid by</p>
            <div className="flex gap-2">
              {(['husband', 'wife'] as const).map(p => {
                const active = paidByFilter.includes(p);
                return (
                  <button key={p} onClick={() => togglePaidBy(p)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all',
                      active ? 'text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] opacity-50'
                    )}
                    style={active ? { backgroundColor: p === 'husband' ? 'var(--husband)' : 'var(--wife)' } : {}}>
                    {p === 'husband' ? '👨 Husband' : '👩 Wife'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category exclusion multi-select */}
          <div>
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
              Exclude categories
            </p>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                value={catFilterSearch}
                onChange={e => setCatFilterSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full bg-[var(--muted)] rounded-xl pl-8 pr-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
              {filteredCategoryList.map(c => {
                const excluded = excludedCategoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCategoryExcluded(c.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                      excluded
                        ? 'bg-red-50 text-red-400 line-through dark:bg-red-950/30'
                        : 'bg-[var(--muted)] text-[var(--foreground)]'
                    )}
                  >
                    {c.icon} {c.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
              Tap a category to exclude it from this analysis — handy for leaving out Investments or EMI when looking at lifestyle spend.
            </p>
          </div>

          <button onClick={clearFilters} className="text-xs text-[var(--primary)] font-semibold">
            Reset all filters
          </button>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <p className="text-4xl mb-2">📊</p>
          <p className="font-medium">No data matches these filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-bold text-[var(--foreground)]">{formatCurrency(total)}</p>
            </div>
            <div className="bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Transactions</p>
              <p className="text-xl font-bold text-[var(--foreground)]">{expenses.length}</p>
            </div>
            <div className="bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Top Category</p>
              <p className="text-sm font-bold text-[var(--foreground)] truncate">
                {topCategory?.icon} {topCategory?.name}
              </p>
            </div>
            <div className="bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Avg / Day</p>
              <p className="text-xl font-bold text-[var(--foreground)]">{formatCurrency(avgDay)}</p>
            </div>
          </div>

          {/* Category Pie */}
          <div className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">By Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={catData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={48}
                >
                  {catData.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {catData.slice(0, 6).map(c => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-xs text-[var(--foreground)] flex-1 truncate">{c.name}</span>
                  <span className="text-xs font-semibold text-[var(--foreground)]">{formatCurrency(c.amount)}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)] w-10 text-right">
                    {((c.amount / total) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily trend */}
          <div className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Daily Trend</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Person bar chart */}
          <div className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Husband vs Wife</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={personData} barSize={48}>
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {personData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
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
