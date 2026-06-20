'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCategories, createCategory, updateCategory, deleteCategory, signOut, fetchExpenses, clearHouseholdCache } from '@/lib/api';
import { Category } from '@/types';
import { ICON_CHOICES, COLOR_CHOICES } from '@/lib/categories';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/lib/theme';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { Moon, Sun, LogOut, Plus, Pencil, Trash2, Tag, Download, User, ChevronRight, Search, Users, Copy, QrCode, Check, KeyRound, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { getMyHousehold, joinHousehold, Household, HouseholdMember } from '@/lib/household';
import { QRCodeSVG } from 'qrcode.react';

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, toggle } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState(ICON_CHOICES[0]);
  const [catColor, setCatColor] = useState(COLOR_CHOICES[0]);
  const [catLoading, setCatLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [catSearch, setCatSearch] = useState('');
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkTab, setLinkTab] = useState<'mycode' | 'enter'>('mycode');
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const load = () => fetchCategories().then(setCategories);

  const loadHousehold = () => {
    getMyHousehold().then(result => {
      if (result) {
        setHousehold(result.household);
        setMembers(result.members);
      }
    });
  };

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || data.user?.phone || '');
      setCurrentUserId(data.user?.id || '');
    });

    loadHousehold();

    // Live updates — when the partner joins, their name appears without a refresh
    const memberCh = supabase.channel('settings_household_members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members' }, loadHousehold)
      .subscribe();

    // Keep categories live — so edits from the partner's phone show up too
    const ch = supabase.channel('settings_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(memberCh); };
  }, []);

  const openAdd = () => {
    setEditingCat(null); setCatName(''); setCatIcon(ICON_CHOICES[0]);
    setCatColor(COLOR_CHOICES[0]);
    setCatModalOpen(true);
  };
  const openEdit = (cat: Category) => {
    setEditingCat(cat); setCatName(cat.name);
    setCatIcon(cat.icon || ICON_CHOICES[0]);
    setCatColor(cat.color || COLOR_CHOICES[0]);
    setCatModalOpen(true);
  };

  const handleSaveCat = async () => {
    if (!catName.trim()) return;
    setCatLoading(true);
    try {
      if (editingCat) {
        const updated = await updateCategory(editingCat.id, {
          name: catName.trim(), icon: catIcon, color: catColor,
        });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast('Category updated ✅');
      } else {
        const created = await createCategory(catName.trim(), catIcon, catColor);
        setCategories(prev => [...prev, created]);
        toast('Category added ✅');
      }
      setCatModalOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error', 'error');
    } finally { setCatLoading(false); }
  };

  const handleDeleteCat = async (cat: Category) => {
    if (deletingId === cat.id) {
      try {
        await deleteCategory(cat.id);
        setCategories(prev => prev.filter(c => c.id !== cat.id));
        toast('Category deleted');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Error', 'error');
      } finally { setDeletingId(null); }
    } else {
      setDeletingId(cat.id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const handleJoinPartner = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    try {
      const myName = members.find(m => m.user_id === currentUserId)?.display_name || 'Partner';
      const joined = await joinHousehold(joinCode, myName);
      toast(`Connected to ${joined.name}! 🎉`);
      setJoinCode('');
      clearHouseholdCache();
      loadHousehold();
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not connect', 'error');
    } finally { setJoinLoading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const expenses = await fetchExpenses();
      const rows = expenses.map(e => ({
        Date: e.expense_date || e.created_at?.slice(0,10),
        Amount: e.amount,
        Category: e.category?.name || '',
        Type: e.spend_type,
        'Paid By': e.paid_by,
        Notes: e.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
      XLSX.writeFile(wb, `duoxpnse-${new Date().toISOString().slice(0,10)}.xlsx`);
      toast('Exported to Excel! 📊');
    } catch { toast('Export failed', 'error'); }
    finally { setExporting(false); }
  };

  const handleSignOut = async () => {
    if (!confirm('Sign out?')) return;
    await signOut();
    router.push('/login');
  };

  const filteredCategories = catSearch.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(catSearch.trim().toLowerCase()))
    : categories;

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="py-4">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Settings</h1>
      </div>

      {/* User info */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--primary)] flex items-center justify-center">
          <User size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--muted-foreground)]">Signed in as</p>
          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{userEmail}</p>
        </div>
      </div>

      {/* Household / Partner */}
      {household && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] mb-4 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Your Household</p>
          </div>

          {/* Members */}
          <div className="p-4 flex items-center gap-3 border-b border-[var(--border)]">
            <div className="flex -space-x-2">
              {members.map(m => (
                <div key={m.id} className="w-9 h-9 rounded-full bg-[var(--primary)] border-2 border-[var(--card)] flex items-center justify-center text-xs font-bold text-white">
                  {m.display_name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <div className="flex-1">
              {members.length === 2 ? (
                <p className="text-sm text-[var(--foreground)]">
                  <span className="font-semibold">{members.find(m => m.user_id === currentUserId)?.display_name || 'You'}</span>
                  {' & '}
                  <span className="font-semibold">{members.find(m => m.user_id !== currentUserId)?.display_name}</span>
                </p>
              ) : (
                <p className="text-sm text-[var(--foreground)]">
                  Using Duoxpnse on your own <Users size={13} className="inline ml-1" />
                </p>
              )}
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                {members.length === 2 ? 'Connected as Duo partners' : 'Works fully on its own — connect any time'}
              </p>
            </div>
          </div>

          {/* Connect a partner — only shown while solo */}
          {members.length < 2 && (
            <div className="p-4">
              <div className="flex bg-[var(--muted)] rounded-2xl p-1 mb-4">
                <button onClick={() => setLinkTab('mycode')}
                  className={cn('flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                    linkTab === 'mycode' ? 'bg-[var(--card)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)]')}>
                  My Code
                </button>
                <button onClick={() => setLinkTab('enter')}
                  className={cn('flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                    linkTab === 'enter' ? 'bg-[var(--card)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted-foreground)]')}>
                  Enter Code
                </button>
              </div>

              {linkTab === 'mycode' && (
                <div className="space-y-3 animate-scale-in">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Share this code with your partner, or let them scan your QR code below.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[var(--muted)] rounded-xl px-3 py-2.5 font-mono text-sm font-bold text-center tracking-wider text-[var(--foreground)]">
                      {household.invite_code}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(household.invite_code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2.5 rounded-xl bg-[var(--secondary)] text-[var(--primary)]"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button onClick={() => setShowQr(!showQr)}
                      className="p-2.5 rounded-xl bg-[var(--secondary)] text-[var(--primary)]">
                      <QrCode size={16} />
                    </button>
                  </div>
                  {showQr && (
                    <div className="flex justify-center p-4 bg-white rounded-2xl animate-scale-in">
                      <QRCodeSVG value={household.invite_code} size={180} />
                    </div>
                  )}
                  <p className="text-[10px] text-[var(--muted-foreground)] text-center">
                    You'll stay the primary account once your partner connects.
                  </p>
                </div>
              )}

              {linkTab === 'enter' && (
                <div className="animate-scale-in">
                  {!showScanner ? (
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Got a code from your partner? Enter it below, or scan their QR code.
                      </p>
                      <Input
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="DUO-XXXXX"
                        icon={<KeyRound size={15} />}
                        className="font-mono tracking-wider text-center"
                      />
                      <Button size="lg" className="w-full" onClick={handleJoinPartner} loading={joinLoading}>
                        Connect
                      </Button>
                      <button onClick={() => setShowScanner(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[var(--muted)] text-[var(--foreground)] font-semibold text-xs">
                        <QrCode size={14} /> Scan their QR code instead
                      </button>
                      <p className="text-[10px] text-[var(--muted-foreground)] text-center">
                        Their account becomes the primary one — any expenses you've already added stay safe and move with you.
                      </p>
                    </div>
                  ) : (
                    <QrScanner
                      onResult={code => { setJoinCode(code); setShowScanner(false); }}
                      onCancel={() => setShowScanner(false)}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preferences */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] mb-4 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Preferences</p>
        </div>
        <button onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--muted)] transition-colors">
          <div className="w-9 h-9 rounded-xl bg-[var(--muted)] flex items-center justify-center">
            {theme === 'dark' ? <Sun size={16} className="text-[var(--warning)]" /> : <Moon size={16} className="text-[var(--primary)]" />}
          </div>
          <span className="flex-1 text-sm font-medium text-[var(--foreground)] text-left">
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </span>
          <ChevronRight size={16} className="text-[var(--muted-foreground)]" />
        </button>
        <button onClick={handleExport} disabled={exporting}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--muted)] transition-colors border-t border-[var(--border)]">
          <div className="w-9 h-9 rounded-xl bg-[var(--muted)] flex items-center justify-center">
            <Download size={16} className="text-[var(--success)]" />
          </div>
          <span className="flex-1 text-sm font-medium text-[var(--foreground)] text-left">
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </span>
          <ChevronRight size={16} className="text-[var(--muted-foreground)]" />
        </button>
      </div>

      {/* Categories */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] mb-4 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Categories</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{categories.length} total · tap 🗑️ twice to delete</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1 text-xs text-[var(--primary)] font-bold bg-[var(--secondary)] px-3 py-1.5 rounded-xl">
            <Plus size={13} /> Add
          </button>
        </div>

        <div className="px-4 py-2 border-b border-[var(--border)]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full bg-[var(--muted)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-[var(--border)] max-h-[480px] overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <p className="text-center text-xs text-[var(--muted-foreground)] py-6">No categories found</p>
          ) : filteredCategories.map(cat => {
            const isDeleting = deletingId === cat.id;
            return (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: (cat.color || '#6B7280') + '20' }}>
                  {cat.icon || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--foreground)] truncate">{cat.name}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(cat)}
                    className="p-1.5 rounded-xl hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteCat(cat)}
                    className={cn(
                      'p-1.5 rounded-xl transition-all text-xs font-bold',
                      isDeleting ? 'bg-red-500 text-white px-2' : 'hover:bg-red-50 text-red-400 dark:hover:bg-red-950/30'
                    )}>
                    {isDeleting ? 'Confirm?' : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50 rounded-2xl text-red-600 dark:bg-red-950/20 dark:text-red-400">
        <LogOut size={18} />
        <span className="font-semibold">Sign out</span>
      </button>

      {/* Category modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)}
        title={editingCat ? 'Edit Category' : 'New Category'} size="md">
        <div className="p-5 space-y-5">
          <Input
            label="Category name"
            value={catName}
            onChange={e => setCatName(e.target.value)}
            placeholder="e.g. Car Repair & Service"
            icon={<Tag size={15} />}
          />

          {/* Icon picker */}
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Icon</p>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: catColor + '20' }}>
                {catIcon}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Tap an icon below to change</p>
            </div>
            <div className="grid grid-cols-9 gap-1.5 max-h-28 overflow-y-auto p-1 bg-[var(--muted)] rounded-2xl">
              {ICON_CHOICES.map(ic => (
                <button key={ic} onClick={() => setCatIcon(ic)}
                  className={cn(
                    'w-full aspect-square rounded-xl flex items-center justify-center text-lg transition-all',
                    catIcon === ic ? 'bg-[var(--primary)]/20 ring-2 ring-[var(--primary)]' : 'hover:bg-[var(--card)]'
                  )}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLOR_CHOICES.map(c => (
                <button key={c} onClick={() => setCatColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    catColor === c && 'ring-2 ring-offset-2 ring-[var(--foreground)]'
                  )}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={handleSaveCat} loading={catLoading}>
            {editingCat ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function QrScanner({ onResult, onCancel }: { onResult: (code: string) => void; onCancel: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let scanner: import('html5-qrcode').Html5Qrcode | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled || !containerRef.current) return;
        scanner = new Html5Qrcode('settings-qr-reader-region');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          (decodedText) => {
            const match = decodedText.match(/DUO-[A-Z0-9]{5}/);
            onResult(match ? match[0] : decodedText);
            scanner?.stop().catch(() => {});
          },
          () => { /* ignore per-frame scan failures */ }
        );
      } catch {
        setError('Could not access camera. Please enter the code manually instead.');
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div id="settings-qr-reader-region" ref={containerRef} className="rounded-2xl overflow-hidden bg-black mb-4 aspect-square" />
      {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}
      <button onClick={onCancel}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[var(--muted)] text-[var(--foreground)] font-semibold text-xs">
        <ArrowLeft size={14} /> Enter code manually
      </button>
    </div>
  );
}
