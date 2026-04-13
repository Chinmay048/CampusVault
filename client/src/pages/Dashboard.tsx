import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { GlassCard } from "../components/ui/GlassCard";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useAuthStore, type AuthUser } from "../store/auth";
import { TierBadge } from "../components/ui/TierBadge";
import { CreditChip } from "../components/ui/CreditChip";
import { PageTransition } from "../components/layout/PageTransition";

type Company = {
  id: string;
  name: string;
  minGpa: number | null;
  package: string | null;
};

type CreditHistory = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
};

const getRoadmapForTier = (tier?: string) => {
  switch(tier) {
    case "BEGINNER": return ["Learn a core language thoroughly", "Solve 50 Leetcode easy problems", "Build a small frontend project"];
    case "INTERMEDIATE": return ["Complete 150 LeetCode (Mediums)", "Build 2 full-stack projects", "Apply to mock interviews"];
    case "ADVANCED": return ["Master Advanced DSA (Graphs/DP)", "Build a complex backend system", "Schedule Senior Mentorship"];
    case "PLACEMENT_READY": return ["Review OS/DBMS/CN concepts", "Conduct daily mock interviews", "Start applying heavily"];
    default: return ["Take the assessment to get a tier!"];
  }
};

export function DashboardPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [eligibleCompanies, setEligibleCompanies] = useState<Company[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditHistory[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }
    apiRequest<AuthUser>("/auth/me", {
      authToken: token,
    })
      .then((me) => setUser(me))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to fetch profile."));
  }, [setUser, token]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const query = new URLSearchParams();
    if (user.branch) {
      query.set("branch", user.branch as string);
    }
    if (typeof user.gpa === "number") {
      query.set("gpa", String(user.gpa));
    }
    apiRequest<Company[]>(`/companies?${query.toString()}`)
      .then(setEligibleCompanies)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to fetch companies."));

    const creditRequestOptions: RequestInit & { headers?: Record<string, string> } = {};
    if (token) {
      creditRequestOptions.authToken = token;
    }
    apiRequest<CreditHistory[]>(`/credits/history`, creditRequestOptions)
      .then(setCreditHistory)
      .catch((error) => console.log("Failed to fetch history:", error));
  }, [user, token]);

  return (
    <PageTransition>
      <PageWrapper title="Dashboard" subtitle="Tier, credits, eligibility, and roadmap panels.">
      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard>
          {!user ? <p>Login to view dashboard metrics.</p> : null}
          {user ? (
            <div className="space-y-3">
              <p className="text-slate-100">Welcome, {user.name}</p>
              <div className="flex items-center gap-3">
                <TierBadge tier={user.tier} />
                <CreditChip credits={user.credits} />
              </div>
              <p className="text-sm text-slate-300">
                Branch: {user.branch ?? "N/A"} · GPA: {user.gpa ?? "N/A"}
              </p>
            </div>
          ) : null}
        </GlassCard>
        <GlassCard>
          <p className="mb-4 text-slate-100 font-medium">Eligible Companies ({eligibleCompanies.length})</p>
          <div className="space-y-3">
            {eligibleCompanies.slice(0, 5).map((company) => (
              <div key={company.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-sm hover:bg-white/10 transition-colors">
                <p className="text-slate-100 font-medium">{company.name}</p>
                <div className="text-slate-400 mt-1 sm:mt-0 flex gap-2 sm:gap-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Min GPA: {company.minGpa ?? "Any"}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {company.package ?? "TBD"}</span>
                </div>
              </div>
            ))}
            {!eligibleCompanies.length ? <p className="text-sm text-slate-400">No eligible companies yet.</p> : null}
          </div>
        </GlassCard>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <GlassCard>
          <p className="mb-4 text-slate-100 font-medium">Step-by-step Roadmap</p>       
          <div className="relative ml-2 border-l-2 border-indigo-500/20 pl-6 space-y-6">
            {getRoadmapForTier(user?.tier).map((step, index) => (
              <div key={index} className="relative">
                  <span className="absolute -left-8.75 top-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#050508] border border-indigo-500/50 font-bold text-indigo-400 text-xs shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                  {index + 1}
                </span>
                <p className="text-sm font-medium text-slate-200 mt-1">{step}</p>       
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="mb-4 text-slate-100 font-medium">Activity Feed</p>
          <div className="relative ml-2 border-l-2 border-slate-700/50 pl-6 space-y-6">
            {creditHistory.slice(0, 5).map((txn) => (
              <div key={txn.id} className="relative">
                  <span className={`absolute -left-7.75 top-2 h-3 w-3 shrink-0 rounded-full ${txn.amount > 0 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]"}`} />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-200">{txn.reason}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(txn.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className={`text-sm font-medium ${txn.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {txn.amount > 0 ? "+" : ""}{txn.amount}
                  </div>
                </div>
              </div>
            ))}
            {!creditHistory.length ? (
              <p className="text-sm text-slate-400 mt-2">No activity yet. Start giving tests!</p>
            ) : null}
          </div>
        </GlassCard>
      </div>

      {message ? <p className="mt-4 text-sm text-rose-300">{message}</p> : null}
    </PageWrapper>
    </PageTransition>
  );
}

