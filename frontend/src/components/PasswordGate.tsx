import { useState, useEffect, useCallback } from 'react';
import { Lock, Eye, EyeOff, Layers } from 'lucide-react';

interface PasswordGateProps {
  children: React.ReactNode;
}

// 访问密码
const ACCESS_PASSWORD = 'jwsyle@1991';

export default function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('imagematch_auth');
    if (saved === 'true') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    if (password === ACCESS_PASSWORD) {
      sessionStorage.setItem('imagematch_auth', 'true');
      setIsAuthenticated(true);
    } else {
      setError('密码错误，请重试');
      setPassword('');
    }
  }, [password]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  }, [handleSubmit]);

  if (isChecking) {
    return null;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-main flex items-center justify-center p-4">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="glass rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ImageMatch</h1>
            <p className="text-sm text-surface-400 mt-1">AI 图像相似度引擎</p>
          </div>

          {/* Lock icon */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-surface-800/80 flex items-center justify-center">
              <Lock className="w-5 h-5 text-accent-400" />
            </div>
          </div>

          <p className="text-center text-surface-300 text-sm mb-6">
            请输入密码以访问应用
          </p>

          {/* Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="输入密码..."
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-surface-800/80 border border-white/10 text-white placeholder-surface-500 focus:outline-none focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20 transition-all text-sm pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-surface-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-accent hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
            >
              进入应用
            </button>
          </form>

          <p className="text-center text-surface-600 text-xs mt-6">
            本应用仅限授权用户使用
          </p>
        </div>
      </div>
    </div>
  );
}
