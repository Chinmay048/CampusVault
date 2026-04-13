import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { GlassCard } from "../components/ui/GlassCard";
import { GlowButton } from "../components/ui/GlowButton";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useAuthStore } from "../store/auth";
import clsx from "clsx";

type CompanyDetail = {
  id: string;
  name: string;
  description: string | null;
  package: string | null;
  eligibleBranches: string[];
  requiredSkills: string[];
  hasUnlockedBundle?: boolean;
  questions: Array<{
    id: string;
    content: string;
    round: string;
    year: number;
    isPremium: boolean;
    answers?: Array<{ content: string }>;
  }>;
};

export function CompanyDetailPage() {
  const token = useAuthStore(s => s.accessToken);
  const user = useAuthStore((s) => s.user);
  
  const setUser = useAuthStore((s) => s.setUser);

  const { id } = useParams();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "qa" | "prep">("overview");
  const [unlockedAnswers, setUnlockedAnswers] = useState<Record<string, string>>({});
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Verification states
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [verifyStates, setVerifyStates] = useState<Record<string, 'idle' | 'verifying' | 'correct' | 'incorrect' | 'error'>>({});
  const [verifyMessages, setVerifyMessages] = useState<Record<string, string>>({});

  const handleVerify = async (qId: string) => {
    const ans = userAnswers[qId];
    if (!ans) return;
    setVerifyStates(p => ({ ...p, [qId]: 'verifying' }));
    try {
      const res = await apiRequest<{ isCorrect: boolean, explanation: string }>(`/questions/${qId}/verify-answer`, {
        method: 'POST',
        body: JSON.stringify({ answer: ans }),
        authToken: token
      });
      setVerifyStates(p => ({ ...p, [qId]: res.isCorrect ? 'correct' : 'incorrect' }));
      setVerifyMessages(p => ({ ...p, [qId]: res.explanation }));
      if (res.isCorrect && user) {
        setUser({ ...user, credits: user.credits + 5 });
      }
    } catch (err) {
      setVerifyStates(p => ({ ...p, [qId]: 'error' }));
      setVerifyMessages(p => ({ ...p, [qId]: err instanceof Error ? err.message : 'Error' }));
    }
  };

  useEffect(() => {
    if (!id) {
      return;
    }
    apiRequest<CompanyDetail>(`/companies/${id}`, token ? { authToken: token } : {})
      .then((data) => {
        setCompany(data);
        const existingUnlocks: Record<string, string> = {};
        for (const q of data.questions) {
          if (q.answers && q.answers.length > 0) {
            existingUnlocks[q.id] = q.answers[0].content;
          }
        }
        setUnlockedAnswers(existingUnlocks);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load company."));
  }, [id, token]);

  const handleUnlockBundle = async () => {
    if (!token || !user) {
      alert("Please sign in to unlock premium company bundles.");
      return;
    }
    if (company?.hasUnlockedBundle) return;
    
    setUnlockingId("bundle");
    try {
      const result = await apiRequest<{ success: boolean; creditsSpent: number; refetchedCompany: CompanyDetail }>(`/companies/${id}/unlock-bundle`, {
        method: "POST",
        authToken: token,
      });

      setCompany(result.refetchedCompany);
      const existingUnlocks: Record<string, string> = {};
      for (const q of result.refetchedCompany.questions) {
        if (q.answers && q.answers.length > 0) {
          existingUnlocks[q.id] = q.answers[0].content;
        }
      }
      setUnlockedAnswers(existingUnlocks);

      if (result.creditsSpent > 0) {
        setUser({ ...user, credits: user.credits - result.creditsSpent });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Bundle unlock failed");
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <PageWrapper title={company?.name ?? "Company Detail"} subtitle={`Company ID: ${id ?? "unknown"}`}>
      {company ? (
        <div className="space-y-6">
          <div className="flex gap-4 border-b border-white/10 pb-2">
            {(["overview", "qa", "prep"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "px-4 py-2 text-sm font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500",
                  activeTab === tab ? "border-b-2 border-indigo-400 text-indigo-400" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {tab === "qa" ? "Interview Q&A" : tab === "prep" ? "Preparation" : "Overview"}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <GlassCard className="space-y-4">
              <p className="text-slate-300">{company.description ?? "No description yet."}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Package</p>
                  <p className="font-medium text-slate-200">{company.package ?? "TBD"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Eligible Branches</p>
                  <p className="font-medium text-slate-200">{company.eligibleBranches.join(", ") || "All"}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-slate-500">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {company.requiredSkills.map((skill) => (
                    <span key={skill} className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">
                      {skill}
                    </span>
                  ))}
                  {!company.requiredSkills.length && <span className="text-xs text-slate-400">None specified</span>}
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === "qa" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                <div>
                  <h3 className="text-slate-200 font-medium">Company Bundle</h3>
                  <p className="text-sm text-slate-400">Unlock all premium interview questions and verified answers for {company.name}.</p>
                </div>
                {company.hasUnlockedBundle ? (
                  <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg text-sm font-medium border border-emerald-500/20">
                    Bundle Unlocked
                  </span>
                ) : (
                  <GlowButton type="button" onClick={handleUnlockBundle} disabled={unlockingId === "bundle"}>
                    {unlockingId === "bundle" ? "Unlocking..." : "Buy Bundle (10 Credits)"}
                  </GlowButton>
                )}
              </div>

              <div className="space-y-3">
              {company.questions.map((q) => (
                <GlassCard key={q.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <p className="text-slate-100">{q.content}</p>
                      
                      <div className={clsx(
                        "mt-3 rounded border border-white/5 bg-black/40 p-4 text-sm",
                        (q.isPremium && !unlockedAnswers[q.id] && !company.hasUnlockedBundle) && "select-none blur-sm"
                      )}>
                        <p className="text-slate-200 mb-2 font-medium">
                          {unlockedAnswers[q.id] ? "Verified Answer: " + unlockedAnswers[q.id] : (q.isPremium && !company.hasUnlockedBundle ? "Premium answers are locked. Buy the Company Bundle to access all complete premium answers." : "")}
                        </p>
                        
                        {!((q.isPremium && !unlockedAnswers[q.id] && !company.hasUnlockedBundle)) && (
                          <div className="mt-4 space-y-2">
                            <p className="text-slate-400">Test your knowledge (AI Verification):</p>
                            <textarea
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              rows={3}
                              placeholder="Enter your answer here..."
                              value={userAnswers[q.id] || ''}
                              onChange={(e) => setUserAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                            />
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                                onClick={() => handleVerify(q.id)}
                                disabled={verifyStates[q.id] === 'verifying' || !userAnswers[q.id]}
                              >
                                {verifyStates[q.id] === 'verifying' ? 'Verifying...' : 'Verify Answer'}
                              </button>
                                {verifyStates[q.id] === 'correct' && <span className="text-emerald-400 font-medium whitespace-pre-wrap wrap-break-word inline-block">Correct! +5 Credits
  {verifyMessages[q.id]}</span>}
                                {verifyStates[q.id] === 'incorrect' && <span className="text-rose-400 whitespace-pre-wrap wrap-break-word inline-block">Incorrect
{verifyMessages[q.id]}</span>}
                              {verifyStates[q.id] === 'error' && <span className="text-red-500">{verifyMessages[q.id]}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 text-right">
                      <span className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
                        {q.round} ({q.year})
                      </span>
                      {q.isPremium && !company.hasUnlockedBundle && (
                        <span className="text-xs text-amber-400 font-medium px-2 py-1 border border-amber-400/20 bg-amber-400/10 rounded">PREMIUM</span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
              {!company.questions.length ? <p className="text-sm text-slate-400">No questions posted yet.</p> : null}
              </div>
            </div>
          )}

          {activeTab === "prep" && (
            <GlassCard>
              <h3 className="mb-2 font-medium text-slate-200">Dynamic Preparation Material</h3>
              <p className="text-sm text-slate-400">Based on your current profile, here is a customized prep guide for {company.name}:</p>
              
              <div className="mt-4 grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-indigo-300 font-semibold mb-2">Target Roles: {user?.targetRoles && user.targetRoles.length > 0 ? user.targetRoles.join(', ') : 'Software Engineer'}</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                    <li>Focus heavily on scalable system design patterns.</li>
                    <li>Review load balancing and database architectures.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-emerald-300 font-semibold mb-2">Language Specific: {user?.languages && user.languages.length > 0 ? user.languages.join(', ') : 'Java/C++'}</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                    <li>Memory management and multithreading concepts.</li>
                    <li>Specific framework event loops or garbage collection intricacies.</li>
                  </ul>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-purple-300 font-semibold mb-2">Build on Strengths: {user?.strongConcepts && user.strongConcepts.length > 0 ? user.strongConcepts.join(', ') : 'DBMS, OS'}</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                    <li>Brush up advanced optimization concepts.</li>
                    <li>Be prepared to explain past projects utilizing your strong concepts.</li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      ) : (
        <GlassCard>
          <p>Loading...</p>
        </GlassCard>
      )}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </PageWrapper>
  );
}  
