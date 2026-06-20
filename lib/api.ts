import { supabase } from './supabase';
import type { Expense, Category } from '@/types';

// ── Household scoping ───────────────────────────────────────
// RLS filters reads automatically, but inserts must stamp household_id explicitly.
let cachedHouseholdId: string | null = null;

export async function getCurrentHouseholdId(): Promise<string> {
  if (cachedHouseholdId) return cachedHouseholdId;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not signed in');

  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userData.user.id)
    .limit(1)
    .maybeSingle();

  if (data) {
    cachedHouseholdId = data.household_id;
    return cachedHouseholdId;
  }

  // Safety net: this account somehow has no household (shouldn't happen via
  // normal signup, but never let the app become unusable). Create one quietly.
  const { createHousehold } = await import('./household');
  const fallbackName = userData.user.email?.split('@')[0] || 'My';
  const household = await createHousehold(fallbackName);
  cachedHouseholdId = household.id;
  return cachedHouseholdId;
}

export function clearHouseholdCache() {
  cachedHouseholdId = null;
}

// ── Categories ──────────────────────────────────────────────
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories').select('*')
    .order('is_default', { ascending: false }).order('name');
  if (error) throw error;
  return data || [];
}

export async function createCategory(
  name: string,
  icon: string,
  color: string
): Promise<Category> {
  const householdId = await getCurrentHouseholdId();
  const { data, error } = await supabase.from('categories')
    .insert({ name, icon, color, is_default: false, household_id: householdId })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: Partial<{
  name: string; icon: string; color: string;
}>): Promise<Category> {
  const { data, error } = await supabase.from('categories')
    .update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { count } = await supabase.from('expenses')
    .select('id', { count: 'exact', head: true }).eq('category_id', id);
  if (count && count > 0) {
    throw new Error(`Cannot delete — this category has ${count} expense(s) linked to it. Please delete those expenses first.`);
  }
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ── Expenses ─────────────────────────────────────────────────
export async function fetchExpenses(filters?: {
  from?: string; to?: string; categoryId?: string;
  paidBy?: string; spendType?: string; search?: string; limit?: number;
}): Promise<Expense[]> {
  let query = supabase.from('expenses')
    .select('*, category:categories(*)')
    .eq('is_deleted', false)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.from) query = query.gte('expense_date', filters.from.slice(0,10));
  if (filters?.to)   query = query.lte('expense_date', filters.to.slice(0,10));
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters?.paidBy && filters.paidBy !== 'all') query = query.eq('paid_by', filters.paidBy);
  if (filters?.spendType && filters.spendType !== 'all') query = query.eq('spend_type', filters.spendType);
  if (filters?.search) query = query.ilike('notes', `%${filters.search}%`);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addExpense(expense: {
  amount: number; category_id: string; paid_by: 'husband'|'wife';
  spend_type: string; notes?: string; expense_date: string;
}): Promise<Expense> {
  const householdId = await getCurrentHouseholdId();
  const { data, error } = await supabase.from('expenses')
    .insert({ ...expense, is_deleted: false, household_id: householdId })
    .select('*, category:categories(*)').single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id: string, updates: Partial<{
  amount: number; category_id: string; paid_by: string;
  spend_type: string; notes: string; expense_date: string;
}>): Promise<Expense> {
  const { data, error } = await supabase.from('expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select('*, category:categories(*)').single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Dashboard ─────────────────────────────────────────────────
export async function fetchDashboardStats() {
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);

  const base = () => supabase.from('expenses').select('amount').eq('is_deleted', false);

  const [todayData, monthData, husbandData, wifeData, recentData] = await Promise.all([
    base().eq('expense_date', today),
    base().gte('expense_date', monthStart).lte('expense_date', monthEnd),
    base().eq('paid_by','husband').gte('expense_date', monthStart).lte('expense_date', monthEnd),
    base().eq('paid_by','wife').gte('expense_date', monthStart).lte('expense_date', monthEnd),
    supabase.from('expenses').select('*, category:categories(*)')
      .eq('is_deleted', false)
      .order('expense_date',{ascending:false})
      .order('created_at',{ascending:false})
      .limit(20),
  ]);

  const sum = (rows: {amount:number}[]|null) => (rows||[]).reduce((a,r)=>a+Number(r.amount),0);
  return {
    totalToday:   sum(todayData.data),
    totalMonth:   sum(monthData.data),
    totalHusband: sum(husbandData.data),
    totalWife:    sum(wifeData.data),
    recentExpenses: recentData.data || [],
  };
}

// ── Analytics ─────────────────────────────────────────────────
export async function fetchAnalytics(from: string, to: string) {
  const { data, error } = await supabase.from('expenses')
    .select('*, category:categories(*)')
    .eq('is_deleted', false)
    .gte('expense_date', from.slice(0,10))
    .lte('expense_date', to.slice(0,10))
    .order('expense_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── Auth ──────────────────────────────────────────────────────
// Sign in with a password (returning users).
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

// Create a brand-new account directly with email + password — no verification email needed.
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

// ── OTP (kept for future use once custom SMTP is configured) ──
export async function sendOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  return data;
}

export async function setPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  clearHouseholdCache();
  if (error) throw error;
}
