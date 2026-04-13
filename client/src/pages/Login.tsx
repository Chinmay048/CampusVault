import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { GlassCard } from "../components/ui/GlassCard";
import { GlowButton } from "../components/ui/GlowButton";
import { GlowInput } from "../components/ui/GlowInput";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useAuthStore, type AuthUser } from "../store/auth";
import { PageTransition } from "../components/layout/PageTransition";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    try {
      const result = await apiRequest<{ user: AuthUser; accessToken: string; refreshToken: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );
      setAuth(result);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <PageWrapper title="Login" subtitle="Sign in to your CampusVault account.">
        <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto mt-10">
          <GlassCard className="w-full">
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2 text-center">Email</label>
                <GlowInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="text-center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2 text-center">Password</label>
                <GlowInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="text-center"
                />
              </div>

              {error ? <p className="text-sm text-rose-300 bg-rose-500/10 p-3 rounded-lg text-center">{error}</p> : null}

              <div className="flex justify-center">
                <GlowButton type="submit" disabled={loading} className="w-full max-w-50">
                  {loading ? "Signing in..." : "Sign In"}
                </GlowButton>
              </div>

              <p className="text-center text-sm text-slate-400 mt-4">
                Don't have an account?{" "}
                <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Register here
                </Link>
              </p>

              <div className="pt-4 border-t border-white/10 mt-6 text-center">
                <p className="text-xs text-slate-400 mb-2">Demo Account:</p>
                <p className="text-xs text-slate-300">Email: <code className="text-cyan-300">demo@placementos.dev</code></p>
                <p className="text-xs text-slate-300">Password: <code className="text-cyan-300">Demo12345!</code></p>
              </div>
            </form>
          </GlassCard>
        </div>
      </PageWrapper>
    </PageTransition>
  );
}
