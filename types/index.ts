export type PaidBy = 'husband' | 'wife';
export type SpendType = 'need' | 'want' | 'luxury' | 'debt_loan' | 'investing';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  is_default: boolean;
  created_at: string;
  budget_limit?: number;
  spend_types?: SpendType[];   // legacy field, no longer used for filtering
}

export interface Expense {
  id: string;
  amount: number;
  category_id: string;
  category?: Category;
  paid_by: PaidBy;
  spend_type: SpendType;
  notes?: string;
  expense_date: string;   // user-chosen date (YYYY-MM-DD)
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface FilterOptions {
  dateFrom?: string;
  dateTo?: string;
  categoryIds?: string[];      // multi-select
  paidBy?: PaidBy | 'all';
  spendTypes?: SpendType[];    // multi-select
  searchQuery?: string;
}
