'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchDashboardStats, fetchCategories, deleteExpense } from '@/lib/api';
import { formatCurrency, getDisplayDate } from '@/lib/utils';
import { SPEND_TYPE_CONFIG } from '@/lib/categories';
import { Expense, Category } from '@/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import ExpenseItem from '@/components/expenses/ExpenseItem';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import FAB from '@/components/layout/FAB';
import { useTheme } from '@/lib/theme';
import { Moon, Sun, TrendingUp } from 'lucide-react';
import { getMyHousehold } from '@/lib/household';

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

  const load = useCallback(async () => {
    try {
      const [s, cats] = await Promise.all([fetchDashboardStats(), fetchCategories()]);
      setStats(s as Stats);
      setCategories(cats);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    load();
    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, load)
      .subscribe();

    // Show partner's name once both accounts are connected
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
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); supabase.removeChannel(memberCh); };
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try { await deleteExpense(id); toast('Deleted'); load(); }
    catch { toast('Failed to delete', 'error'); }
  };

  const now = new Date();

  // Group by display date
  const grouped: Record<string, Expense[]> = {};
  (stats?.recentExpenses || []).forEach(e => {
    const label = getDisplayDate(e);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(e);
  });

  // Spend type breakdown
  const spendBreakdown = {
    need:       (stats?.recentExpenses||[]).filter(e=>e.spend_type==='need').reduce((s,e)=>s+Number(e.amount),0),
    want:       (stats?.recentExpenses||[]).filter(e=>e.spend_type==='want').reduce((s,e)=>s+Number(e.amount),0),
    luxury:     (stats?.recentExpenses||[]).filter(e=>e.spend_type==='luxury').reduce((s,e)=>s+Number(e.amount),0),
    money_lent: (stats?.recentExpenses||[]).filter(e=>e.spend_type==='money_lent').reduce((s,e)=>s+Number(e.amount),0),
    investing:  (stats?.recentExpenses||[]).filter(e=>e.spend_type==='investing').reduce((s,e)=>s+Number(e.amount),0),
  };

  const totalSplit = (stats?.totalHusband||0) + (stats?.totalWife||0);

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
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

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-28 bg-[var(--muted)] rounded-3xl animate-pulse"/>)}</div>
      ) : (
        <>
          {/* Hero */}
          <div className="rounded-3xl p-5 mb-3 overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg,#6C63FF 0%,#A78BFA 100%)' }}>
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10"/>
            <div className="absolute -bottom-6 -left-4 w-20 h-20 rounded-full bg-white/10"/>
            <div className="relative">
              <p className="text-white/70 text-xs font-medium mb-1">
                {now.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}
              </p>
              <p className="text-4xl font-bold text-white mb-3">{formatCurrency(stats?.totalMonth||0)}</p>
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <TrendingUp size={12}/>
                <span>Today: {formatCurrency(stats?.totalToday||0)}</span>
              </div>
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

          {/* Spending breakdown — Need / Want / Luxury / Debt / EMI */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 mb-5">
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Spending Breakdown</p>
            <div className="grid grid-cols-3 gap-2">
              {(['need','want','luxury','money_lent','investing'] as const)
                .filter(t => spendBreakdown[t] > 0 || t === 'need' || t === 'want' || t === 'luxury')
                .map(t => {
                const cfg = SPEND_TYPE_CONFIG[t];
                return (
                  <div key={t} className="rounded-2xl p-3 text-center" style={{backgroundColor: cfg.bg}}>
                    <div className="text-2xl mb-1">{cfg.icon}</div>
                    <p className="text-xs font-bold" style={{color:cfg.color}}>{formatCurrency(spendBreakdown[t])}</p>
                    <p className="text-[10px] font-semibold mt-0.5" style={{color:cfg.color}}>{cfg.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent */}
          <h2 className="font-bold text-base text-[var(--foreground)] mb-3">Recent Expenses</h2>
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-14 text-[var(--muted-foreground)]">
              <p className="text-5xl mb-3">💸</p>
              <p className="font-semibold">No expenses yet</p>
              <p className="text-sm mt-1">Tap + to add your first one</p>
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
