export type PaidBy = 'husband' | 'wife';
// First-layer tags only — Money Borrowed and Loan removed as per request.
// Loan Repayment is a second-layer category, not a tag.
export type SpendType = 'need' | 'want' | 'luxury' | 'money_lent' | 'investing';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  is_default: boolean;
  created_at: string;
  budget_limit?: number;
  spend_types?: SpendType[];
}

export interface Expense {
  id: string;
  amount: number;
  category_id: string;
  category?: Category;
  paid_by: PaidBy;
  spend_type: SpendType;
  notes?: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface FilterOptions {
  dateFrom?: string;
  dateTo?: string;
  categoryIds?: string[];
  paidBy?: PaidBy | 'all';
  spendTypes?: SpendType[];
  searchQuery?: string;
}
