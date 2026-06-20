'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import { Mail, Lock, Wallet } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Login failed. Check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-5">
      <div className="mb-10 text-center animate-slide-up">
        <div className="w-16 h-16 rounded-3xl bg-[var(--primary)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--primary)]/30">
          <Wallet size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Duoxpnse</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">Track smarter, spend better</p>
      </div>

      <div className="w-full max-w-sm animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <div className="bg-[var(--card)] rounded-3xl p-6 border border-[var(--border)] shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Sign in</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input label="Email" type="email" id="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              icon={<Mail size={16} />} autoComplete="email" required />
            <Input label="Password" type="password" id="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              icon={<Lock size={16} />} autoComplete="current-password" required />
            <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>

        <div className="text-center text-sm text-[var(--muted-foreground)] mt-6 space-y-2">
          <p>
            New here?{' '}
            <Link href="/signup" className="text-[var(--primary)] font-semibold">Create an account</Link>
          </p>
          <p>
            Joining your partner?{' '}
            <Link href="/signup" className="text-[var(--primary)] font-semibold">Create an account, then connect from Settings</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
