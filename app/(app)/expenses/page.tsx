'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchExpenses, fetchCategories, deleteExpense } from '@/lib/api';
import { getDateRange, formatCurrency } from '@/lib/utils';
import { Expense, Category } from '@/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import ExpenseItem from '@/components/expenses/ExpenseItem';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import FAB from '@/components/layout/FAB';
import Input from '@/components/ui/Input';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPEND_TYPE_CONFIG, SPEND_TYPE_ORDER } from '@/lib/categories';

const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
] as const;

type QuickFilter = typeof QUICK_FILTERS[number]['id'];

export default function ExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('all');
  const [spendTypeFilter, setSpendTypeFilter] = useState('all');
  const [catFilterSearch, setCatFilterSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    try {
      const range = quickFilter !== 'all' ? getDateRange(quickFilter) : {};
      const data = await fetchExpenses({
        from: range.from,
        to: range.to,
        categoryId: categoryFilter || undefined,
        paidBy: personFilter !== 'all' ? personFilter as 'husband' | 'wife' : undefined,
        spendType: spendTypeFilter !== 'all' ? spendTypeFilter : undefined,
        search: search || undefined,
      });
      setExpenses(data);
    } catch {
      toast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [quickFilter, categoryFilter, personFilter, spendTypeFilter, search, toast]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetchCategories().then(setCategories);
    const channel = supabase
      .channel('expenses_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      toast('Expense deleted');
      load();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const hasFilters = categoryFilter || personFilter !== 'all' || spendTypeFilter !== 'all';

  return (
    <div className="px-4 pt-safe">
      {/* Header */}
      <div className="py-5">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Expenses</h1>
        {!loading && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {expenses.length} entries · {formatCurrency(total)} total
          </p>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center transition-colors',
            showFilters || hasFilters
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--input)] text-[var(--muted-foreground)]'
          )}
        >
          {hasFilters ? <X size={16} /> : <SlidersHorizontal size={16} />}
        </button>
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {QUICK_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setQuickFilter(f.id)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-all',
              quickFilter === f.id
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-4 mb-4 animate-slide-up space-y-3">
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Tag</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSpendTypeFilter('all')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                  spendTypeFilter === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                )}
              >
                All
              </button>
              {SPEND_TYPE_ORDER.map(t => {
                const cfg = SPEND_TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setSpendTypeFilter(t === spendTypeFilter ? 'all' : t)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                      spendTypeFilter === t ? 'text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    )}
                    style={spendTypeFilter === t ? { backgroundColor: cfg.color } : {}}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">Category</p>
            </div>
            <input
              value={catFilterSearch}
              onChange={e => setCatFilterSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full bg-[var(--muted)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none mb-2"
            />
            <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
              <button
                onClick={() => setCategoryFilter('')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                  !categoryFilter ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                )}
              >
                All
              </button>
              {categories
                .filter(c => !catFilterSearch.trim() || c.name.toLowerCase().includes(catFilterSearch.trim().toLowerCase()))
                .map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id === categoryFilter ? '' : c.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                    categoryFilter === c.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  )}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Paid by</p>
            <div className="flex gap-2">
              {['all', 'husband', 'wife'].map(p => (
                <button
                  key={p}
                  onClick={() => setPersonFilter(p)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all',
                    personFilter === p ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                  )}
                >
                  {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setCategoryFilter(''); setPersonFilter('all'); setSpendTypeFilter('all'); setCatFilterSearch(''); setShowFilters(false); }}
            className="text-xs text-[var(--primary)] font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[var(--muted)] rounded-2xl animate-pulse" />)}
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <p className="text-4xl mb-2">🔍</p>
          <p className="font-medium">No expenses found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2 pb-6">
          {expenses.map(exp => (
            <ExpenseItem
              key={exp.id}
              expense={exp}
              onEdit={e => { setEditingExpense(e); setFormOpen(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <FAB onClick={() => { setEditingExpense(undefined); setFormOpen(true); }} />
      <ExpenseForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingExpense(undefined); }}
        onSuccess={load}
        categories={categories}
        expense={editingExpense}
      />
    </div>
  );
}
