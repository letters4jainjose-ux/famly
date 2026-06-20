'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Category, Expense, SpendType } from '@/types';
import { addExpense, updateExpense } from '@/lib/api';
import { cn, todayInputDate } from '@/lib/utils';
import { SPEND_TYPE_CONFIG, SPEND_TYPE_ORDER } from '@/lib/categories';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Calendar, ChevronLeft, Search, X } from 'lucide-react';

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];  // live DB categories
  expense?: Expense;
}

type Step = 'amount' | 'spendtype' | 'category' | 'person';

export default function ExpenseForm({ open, onClose, onSuccess, categories, expense }: ExpenseFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [spendType, setSpendType] = useState<SpendType>('need');
  const [categoryId, setCategoryId] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [paidBy, setPaidBy] = useState<'husband'|'wife'>('husband');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayInputDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const catSearchRef = useRef<HTMLInputElement>(null);
  const isEditing = !!expense;

  useEffect(() => {
    if (open) {
      if (isEditing) {
        setAmount(expense.amount.toString());
        setSpendType(expense.spend_type || 'need');
        setCategoryId(expense.category_id);
        setPaidBy(expense.paid_by);
        setNotes(expense.notes || '');
        setExpenseDate(expense.expense_date ? expense.expense_date.slice(0,10) : todayInputDate());
        setStep('amount');
      } else {
        setAmount(''); setSpendType('need'); setCategoryId('');
        setPaidBy('husband'); setNotes(''); setExpenseDate(todayInputDate());
        setStep('amount');
      }
      setCatSearch('');
      setShowDatePicker(false);
    }
  }, [open, expense, isEditing]);

  useEffect(() => {
    if (open && step === 'amount') setTimeout(() => amountRef.current?.focus(), 200);
  }, [open, step]);

  useEffect(() => {
    if (step === 'category') setTimeout(() => catSearchRef.current?.focus(), 150);
  }, [step]);

  const steps: Step[] = ['amount', 'spendtype', 'category', 'person'];
  const stepIndex = steps.indexOf(step);

  // All categories are available under every spend type — filter only by search.
  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    const q = catSearch.trim().toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, catSearch]);

  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleSave = async (person: 'husband' | 'wife') => {
    const val = parseFloat(amount);
    if (!val || !categoryId) return;
    setLoading(true);
    try {
      const payload = {
        amount: val,
        category_id: categoryId,
        paid_by: person,
        spend_type: spendType,
        notes,
        expense_date: expenseDate,
      };
      if (isEditing) {
        await updateExpense(expense.id, payload);
        toast('Expense updated! ✅');
      } else {
        await addExpense(payload);
        toast('Expense added! 💰');
      }
      onSuccess(); onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally { setLoading(false); }
  };

  const stepLabel = ['Amount', 'Type', 'Category', 'Paid by'];

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="p-5">
        {/* Step bar */}
        <div className="flex items-center gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                'h-1 rounded-full w-full transition-all duration-300',
                i < stepIndex ? 'bg-[var(--primary)]/40' :
                i === stepIndex ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              )} />
              <span className={cn(
                'text-[9px] font-semibold uppercase tracking-wider transition-colors',
                i === stepIndex ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]/50'
              )}>{stepLabel[i]}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: Amount + Date */}
        {step === 'amount' && (
          <div className="animate-scale-in">
            <p className="text-center text-sm font-medium text-[var(--muted-foreground)] mb-3">How much did you spend?</p>
            <div className="flex items-center justify-center gap-2 bg-[var(--muted)] rounded-3xl px-5 py-5 mb-4">
              <span className="text-3xl font-bold text-[var(--muted-foreground)]">₹</span>
              <input
                ref={amountRef}
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && parseFloat(amount) > 0 && setStep('spendtype')}
                placeholder="0"
                className="flex-1 bg-transparent text-5xl font-bold text-[var(--foreground)] placeholder:text-[var(--border)] focus:outline-none text-center"
              />
            </div>

            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full flex items-center justify-between bg-[var(--muted)] rounded-2xl px-4 py-3 mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-[var(--primary)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {expenseDate === todayInputDate() ? 'Today' : expenseDate}
                </span>
              </div>
              <span className="text-xs text-[var(--primary)] font-semibold">
                {showDatePicker ? 'Done' : 'Change date'}
              </span>
            </button>

            {showDatePicker && (
              <div className="mb-3 animate-slide-up">
                <input
                  type="date"
                  value={expenseDate}
                  max={todayInputDate()}
                  onChange={e => { setExpenseDate(e.target.value); setShowDatePicker(false); }}
                  className="w-full bg-[var(--muted)] border border-[var(--primary)] rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none"
                />
              </div>
            )}

            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add a note (optional)"
              className="w-full bg-[var(--muted)] rounded-2xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none mb-4"
            />
            <button
              onClick={() => setStep('spendtype')}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full py-4 rounded-2xl bg-[var(--primary)] text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-all">
              Next →
            </button>
          </div>
        )}

        {/* STEP 2: Spend Type */}
        {step === 'spendtype' && (
          <div className="animate-scale-in">
            <button onClick={() => setStep('amount')} className="flex items-center gap-1 text-sm text-[var(--primary)] font-medium mb-4">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="text-center mb-5">
              <p className="text-2xl font-bold text-[var(--foreground)]">₹{parseFloat(amount).toLocaleString('en-IN')}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{expenseDate === todayInputDate() ? 'Today' : expenseDate}</p>
            </div>
            <p className="text-center text-sm font-semibold text-[var(--muted-foreground)] mb-4 uppercase tracking-wider">
              What kind of expense is this?
            </p>
            <div className="space-y-3">
              {SPEND_TYPE_ORDER.map(key => {
                const cfg = SPEND_TYPE_CONFIG[key];
                return (
                  <button key={key}
                    onClick={() => { setSpendType(key); setCategoryId(''); setCatSearch(''); setStep('category'); }}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-95',
                      spendType === key ? 'border-[var(--primary)] bg-[var(--secondary)]' : 'border-transparent bg-[var(--muted)]'
                    )}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ backgroundColor: cfg.bg }}>{cfg.icon}</div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-lg text-[var(--foreground)]">{cfg.label}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{cfg.desc}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: cfg.color, backgroundColor: spendType === key ? cfg.color : 'transparent' }}>
                      {spendType === key && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Category — live from DB, filtered + searchable */}
        {step === 'category' && (
          <div className="animate-scale-in">
            <button onClick={() => setStep('spendtype')} className="flex items-center gap-1 text-sm text-[var(--primary)] font-medium mb-4">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-xl text-[var(--foreground)]">₹{parseFloat(amount).toLocaleString('en-IN')}</p>
                <span className="text-xs px-2 py-0.5 rounded-lg font-semibold"
                  style={{ backgroundColor: SPEND_TYPE_CONFIG[spendType].bg, color: SPEND_TYPE_CONFIG[spendType].color }}>
                  {SPEND_TYPE_CONFIG[spendType].icon} {SPEND_TYPE_CONFIG[spendType].label}
                </span>
              </div>
            </div>

            {/* Search box */}
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                ref={catSearchRef}
                type="text"
                value={catSearch}
                onChange={e => setCatSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full bg-[var(--muted)] rounded-2xl pl-10 pr-9 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              {catSearch && (
                <button onClick={() => setCatSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                  <X size={14} />
                </button>
              )}
            </div>

            {filteredCategories.length === 0 ? (
              <div className="text-center py-10 text-[var(--muted-foreground)]">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm font-medium">No categories found</p>
                <p className="text-xs mt-1">Try a different search, or add it in Settings</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pb-1 pr-1">
                {filteredCategories.map(cat => {
                  const selected = categoryId === cat.id;
                  return (
                    <button key={cat.id}
                      onClick={() => { setCategoryId(cat.id); setStep('person'); }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95',
                        selected ? 'border-[var(--primary)] bg-[var(--secondary)]' : 'border-transparent bg-[var(--muted)]'
                      )}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: (cat.color || '#6B7280') + '20' }}>
                        {cat.icon || '📦'}
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--foreground)] text-center leading-tight">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {isEditing && categoryId && (
              <button onClick={() => setStep('person')}
                className="w-full mt-4 py-3.5 rounded-2xl bg-[var(--primary)] text-white font-bold active:scale-95 transition-all">
                Continue →
              </button>
            )}
          </div>
        )}

        {/* STEP 4: Paid by */}
        {step === 'person' && (
          <div className="animate-scale-in">
            <button onClick={() => setStep('category')} className="flex items-center gap-1 text-sm text-[var(--primary)] font-medium mb-4">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="text-center mb-6">
              <p className="text-2xl font-bold text-[var(--foreground)]">₹{parseFloat(amount).toLocaleString('en-IN')}</p>
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-lg font-semibold"
                  style={{ backgroundColor: SPEND_TYPE_CONFIG[spendType].bg, color: SPEND_TYPE_CONFIG[spendType].color }}>
                  {SPEND_TYPE_CONFIG[spendType].icon} {SPEND_TYPE_CONFIG[spendType].label}
                </span>
                {selectedCategory && (
                  <span className="text-xs px-2 py-0.5 rounded-lg font-semibold bg-[var(--muted)] text-[var(--foreground)]">
                    {selectedCategory.icon} {selectedCategory.name}
                  </span>
                )}
                <span className="text-xs text-[var(--muted-foreground)]">
                  {expenseDate === todayInputDate() ? 'Today' : expenseDate}
                </span>
              </div>
            </div>
            <p className="text-center text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-5">Who paid?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleSave('husband')} disabled={loading}
                className="flex flex-col items-center gap-3 py-8 rounded-3xl border-2 border-[var(--husband)]/30 bg-[var(--husband)]/5 active:scale-95 transition-all disabled:opacity-50">
                <div className="w-16 h-16 rounded-2xl bg-[var(--husband)] flex items-center justify-center text-4xl">👨</div>
                <span className="font-bold text-xl" style={{ color: 'var(--husband)' }}>Husband</span>
              </button>
              <button onClick={() => handleSave('wife')} disabled={loading}
                className="flex flex-col items-center gap-3 py-8 rounded-3xl border-2 border-[var(--wife)]/30 bg-[var(--wife)]/5 active:scale-95 transition-all disabled:opacity-50">
                <div className="w-16 h-16 rounded-2xl bg-[var(--wife)] flex items-center justify-center text-4xl">👩</div>
                <span className="font-bold text-xl" style={{ color: 'var(--wife)' }}>Wife</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
