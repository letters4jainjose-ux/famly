'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchDashboardStats, fetchCategories, deleteExpense } from '@/lib/api';
import { formatCurrency, getDisplayDate } from '@/lib/utils';
import { SPEND_TYPE_CONFIG, SPEND_TYPE_ORDER } from '@/lib/categories';
import { Expense, Category } from '@/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import ExpenseItem from '@/components/expenses/ExpenseItem';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import FAB from '@/components/layout/FAB';
import { useTheme } from '@/lib/theme';
import { Moon, Sun, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMyHousehold } from '@/lib/household';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface Stats {
  totalToday: number; totalMonth: number;
  totalHusband: number; totalWife: number;
  recentExpenses: Expense[];
}

export default function DashboardPage() {
  const { toast } = useToast();
  const { theme, toggle } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  // Month selector — always defaults to current month
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  const monthStart = startOfMonth(selectedMonth).toISOString().slice(0,10);
  const monthEnd   = endOfMonth(selectedMonth).toISOString().slice(0,10);

  const load = useCallback(async () => {
    try {
      const [s, cats] = await Promise.all([
        fetchDashboardStats(monthStart, monthEnd),
        fetchCategories(),
      ]);
      setStats(s as Stats);
      setCategories(cats);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [monthStart, monthEnd, toast]);

  useEffect(() => {
    load();
    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, load)
      .subscribe();

    supabase.auth.getUser().then(async ({ data: userData }) => {
      const result = await getMyHousehold();
      if (result && userData.user) {
        const partner = result.members.find(m => m.user_id !== userData.user!.id);
        setPartnerName(partner?.display_name || null);
      }
    });

    const memberCh = supabase.channel('dashboard_members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members' }, async () => {
        const result = await getMyHousehold();
        const { data: userData } = await supabase.auth.getUser();
        if (result && userData.user) {
          const partner = result.members.find(m => m.user_id !== userData.user!.id);
          setPartnerName(partner?.display_name || null);
        }
      }).subscribe();

    return () => { supabase.removeChannel(ch); supabase.removeChannel(memberCh); };
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try { await deleteExpense(id); toast('Deleted'); load(); }
    catch { toast('Failed to delete', 'error'); }
  };

  const now = new Date();

  // Group expenses by display date
  const grouped: Record<string, Expense[]> = {};
  (stats?.recentExpenses || []).forEach(e => {
    const label = getDisplayDate(e);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(e);
  });

  // Spend-type breakdown — computed from the month's expenses only
  const spendBreakdown: Record<string, { amount: number; count: number }> = {};
  (stats?.recentExpenses || []).forEach(e => {
    const t = e.spend_type;
    if (!spendBreakdown[t]) spendBreakdown[t] = { amount: 0, count: 0 };
    spendBreakdown[t].amount += Number(e.amount);
    spendBreakdown[t].count += 1;
  });

  const totalSplit = (stats?.totalHusband||0) + (stats?.totalWife||0);

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--muted-foreground)] font-medium">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Duoxpnse 💰</h1>
          {partnerName && (
            <p className="text-[11px] text-[var(--primary)] font-semibold mt-0.5">
              💞 Connected with {partnerName}
            </p>
          )}
        </div>
        <button onClick={toggle}
          className="w-10 h-10 rounded-2xl bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between bg-[var(--card)] rounded-2xl border border-[var(--border)] px-4 py-2.5 mb-3">
        <button onClick={() => setSelectedMonth(m => subMonths(m, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-[var(--foreground)]">
            {format(selectedMonth, 'MMMM yyyy')}
          </p>
          {isCurrentMonth && (
            <p className="text-[10px] text-[var(--primary)] font-semibold">Current Month</p>
          )}
        </div>
        <button
          onClick={() => setSelectedMonth(m => addMonths(m, 1))}
          disabled={isCurrentMonth}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-28 bg-[var(--muted)] rounded-3xl animate-pulse"/>)}</div>
      ) : (
        <>
          {/* Hero card */}
          <div className="rounded-3xl p-5 mb-3 overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg,#6C63FF 0%,#A78BFA 100%)' }}>
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10"/>
            <div className="absolute -bottom-6 -left-4 w-20 h-20 rounded-full bg-white/10"/>
            <div className="relative">
              <p className="text-white/70 text-xs font-medium mb-1">
                Total · {format(selectedMonth, 'MMMM yyyy')}
              </p>
              <p className="text-4xl font-bold text-white mb-3">
                {formatCurrency(stats?.totalMonth||0)}
              </p>
              {isCurrentMonth && (
                <div className="flex items-center gap-1 text-white/80 text-xs">
                  <TrendingUp size={12}/>
                  <span>Today: {formatCurrency(stats?.totalToday||0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Husband / Wife split */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 mb-3">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--husband)]/10 flex items-center justify-center text-xl">👨</div>
                <div>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-medium">Husband</p>
                  <p className="font-bold text-base" style={{color:'var(--husband)'}}>
                    {formatCurrency(stats?.totalHusband||0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--wife)]/10 flex items-center justify-center text-xl">👩</div>
                <div>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-medium">Wife</p>
                  <p className="font-bold text-base" style={{color:'var(--wife)'}}>
                    {formatCurrency(stats?.totalWife||0)}
                  </p>
                </div>
              </div>
            </div>
            {totalSplit > 0 && (
              <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden flex">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${((stats?.totalHusband||0)/totalSplit)*100}%`, background: 'var(--husband)' }}/>
                <div className="flex-1" style={{ background: 'var(--wife)' }}/>
              </div>
            )}
          </div>

          {/* Spending breakdown — all 5 tags, month-filtered, count shown */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 mb-5">
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
              Spending Breakdown · {format(selectedMonth, 'MMM yyyy')}
            </p>
            {Object.keys(spendBreakdown).length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] text-center py-2">No expenses this month yet</p>
            ) : (
              <div className="space-y-2.5">
                {SPEND_TYPE_ORDER.map(t => {
                  const data = spendBreakdown[t];
                  if (!data) return null;
                  const cfg = SPEND_TYPE_CONFIG[t];
                  const total = stats?.totalMonth || 1;
                  const pct = (data.amount / total) * 100;
                  return (
                    <div key={t}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cfg.icon}</span>
                          <span className="text-xs font-semibold text-[var(--foreground)]">{cfg.label}</span>
                          <span className="text-[10px] bg-[var(--muted)] px-1.5 py-0.5 rounded-lg text-[var(--muted-foreground)]">
                            {data.count}×
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[var(--foreground)]">
                          {formatCurrency(data.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent expenses for selected month */}
          <h2 className="font-bold text-base text-[var(--foreground)] mb-3">
            {isCurrentMonth ? 'Recent Expenses' : `Expenses · ${format(selectedMonth, 'MMM yyyy')}`}
          </h2>
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-14 text-[var(--muted-foreground)]">
              <p className="text-5xl mb-3">💸</p>
              <p className="font-semibold">No expenses this month</p>
              {isCurrentMonth && <p className="text-sm mt-1">Tap + to add your first one</p>}
            </div>
          ) : (
            Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="mb-4">
                <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">{date}</p>
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)]">
                  {items.map(exp => (
                    <div key={exp.id} className="px-4">
                      <ExpenseItem expense={exp}
                        onEdit={e=>{setEditingExpense(e);setFormOpen(true);}}
                        onDelete={handleDelete} compact />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div className="h-6"/>
        </>
      )}

      <FAB onClick={()=>{setEditingExpense(undefined);setFormOpen(true);}}/>
      <ExpenseForm open={formOpen}
        onClose={()=>{setFormOpen(false);setEditingExpense(undefined);}}
        onSuccess={load} categories={categories} expense={editingExpense}/>
    </div>
  );
}
