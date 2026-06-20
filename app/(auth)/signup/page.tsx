'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/api';
import { createHousehold } from '@/lib/household';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import { Mail, Lock, User, Wallet, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ name: string } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) return;
    if (password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

    setLoading(true);
    try {
      await signUp(email, password);
      await createHousehold(displayName.trim());
      setSuccess({ name: displayName.trim() });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Signup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={44} className="text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">You're all set, {success.name}! 🎉</h1>
          <p className="text-[var(--muted-foreground)] text-sm mb-8">
            Your account is ready. You can start tracking expenses right away —
            and connect with your partner any time from Settings.
          </p>
          <Button size="lg" className="w-full" onClick={() => router.push('/dashboard')}>
            Go to my dashboard →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-5 py-10">
      <div className="mb-8 text-center animate-slide-up">
        <div className="w-16 h-16 rounded-3xl bg-[var(--primary)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--primary)]/30">
          <Wallet size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Duoxpnse</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">Create your account</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-[var(--card)] rounded-3xl p-6 border border-[var(--border)] shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Sign up</h2>
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Your name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Jain"
              icon={<User size={16} />}
              autoFocus
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              icon={<Mail size={16} />}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              icon={<Lock size={16} />}
              required
            />
            <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--primary)] font-semibold">Sign in</Link>
        </p>
        <p className="text-center text-sm text-[var(--muted-foreground)] mt-2">
          Joining your partner's household?{' '}
          <Link href="/login" className="text-[var(--primary)] font-semibold">Sign in, then connect from Settings</Link>
        </p>
      </div>
    </div>
  );
}
