'use client';

import { useState } from 'react';
import { Expense } from '@/types';
import { formatCurrency, formatDateTime, cn, getDisplayDate } from '@/lib/utils';
import { SPEND_TYPE_CONFIG } from '@/lib/categories';
import { Pencil, Trash2, ChevronDown, Calendar, Clock } from 'lucide-react';

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export default function ExpenseItem({ expense, onEdit, onDelete, compact }: ExpenseItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const icon  = expense.category?.icon  || '📦';
  const color = expense.category?.color || '#6B7280';
  const name  = expense.category?.name  || 'Unknown';

  const isHusband = expense.paid_by === 'husband';
  const spendCfg  = SPEND_TYPE_CONFIG[expense.spend_type || 'need'];

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete(expense.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: color + '20' }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-lg font-bold"
              style={{ backgroundColor: spendCfg.bg, color: spendCfg.color }}>
              {spendCfg.icon} {spendCfg.label}
            </span>
            {expense.notes && (
              <span className="text-[10px] text-[var(--muted-foreground)] truncate">{expense.notes}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(expense.amount)}</p>
            <p className="text-[10px] font-semibold" style={{ color: isHusband ? 'var(--husband)' : 'var(--wife)' }}>
              {isHusband ? '👨' : '👩'}
            </p>
          </div>
          {/* Quick delete on compact */}
          <button
            onClick={e => { e.stopPropagation(); onDelete(expense.id); }}
            className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center text-red-400 active:scale-90 transition-all dark:bg-red-950/30"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden mb-2">
      <button className="w-full flex items-center gap-3 p-4 text-left active:bg-[var(--muted)]/30"
        onClick={() => setExpanded(!expanded)}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: color + '20' }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[var(--foreground)]">{name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold"
              style={{ backgroundColor: spendCfg.bg, color: spendCfg.color }}>
              {spendCfg.icon} {spendCfg.label}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-lg font-semibold"
              style={{
                backgroundColor: isHusband ? '#EEF2FF' : '#FFF0F5',
                color: isHusband ? 'var(--husband)' : 'var(--wife)'
              }}>
              {isHusband ? '👨 Husband' : '👩 Wife'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <p className="font-bold text-[var(--foreground)]">{formatCurrency(expense.amount)}</p>
          <ChevronDown size={16} className={cn(
            'text-[var(--muted-foreground)] transition-transform duration-200',
            expanded && 'rotate-180'
          )} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 animate-slide-up">
          <div className="flex gap-4 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <Calendar size={12} />
              <span>{expense.expense_date || expense.created_at?.slice(0,10)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <Clock size={12} />
              <span>{formatDateTime(expense.created_at)}</span>
            </div>
          </div>
          {expense.notes && (
            <p className="text-sm text-[var(--foreground)] bg-[var(--muted)] rounded-xl px-3 py-2 mb-3">
              {expense.notes}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={() => onEdit(expense)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[var(--secondary)] text-[var(--primary)] text-sm font-bold active:scale-95 transition-all">
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={handleDeleteClick}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all',
                confirmDelete
                  ? 'bg-red-500 text-white'
                  : 'bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400'
              )}
            >
              <Trash2 size={13} />
              {confirmDelete ? 'Tap again to confirm' : 'Delete'}
            </button>
          </div>
          {confirmDelete && (
            <p className="text-[10px] text-center text-red-400 mt-2">
              ⚠️ This expense will be permanently removed from all reports
            </p>
          )}
        </div>
      )}
    </div>
  );
}
