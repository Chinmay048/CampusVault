import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { GlassCard } from "../components/ui/GlassCard";
import { GlowButton } from "../components/ui/GlowButton";
import { GlowInput } from "../components/ui/GlowInput";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useAuthStore } from "../store/auth";

type Question = {
  id: string;
  companyId: string;
  content: string;
  round: string;
  year: number;
  isPremium: boolean;
  creditsToUnlock: number;
};

export function ForumPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [content, setContent] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [round, setRound] = useState("Technical");
  const [year, setYear] = useState(new Date().getFullYear());
  const [message, setMessage] = useState("");

  const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);

  const loadQuestions = () => {
    apiRequest<Question[]>("/questions")
      .then(setQuestions)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load questions."));
  };

  const loadCompanies = () => {
    apiRequest<{id: string, name: string}[]>("/companies")
      .then(setCompanies)
      .catch(() => {});
  };

  useEffect(() => {
    loadQuestions();
    loadCompanies();
  }, []);

  const submitQuestion = async () => {
    if (!token) {
      setMessage("Login required.");
      return;
    }
    try {
      await apiRequest("/questions", {
        method: "POST",
        authToken: token,
        body: JSON.stringify({
          companyId,
          content,
          round,
          year: Number(year),
        }),
      });
      setContent("");
      setCompanyId("");
      setMessage("Question posted.");
      loadQuestions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not post question.");
    }
  };

  return (
    <PageWrapper title="Interview Forum" subtitle="Community Q&A across companies and rounds.">
      <div className="space-y-4">
        <GlassCard className="space-y-3">
          <p className="text-slate-100">Post a question</p>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 backdrop-blur-sm"
          >
            <option value="" disabled className="bg-slate-900">Select Company</option>
            {companies.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
            ))}
          </select>
          <GlowInput value={round} onChange={(e) => setRound(e.target.value)} placeholder="Round" />
            <GlowInput value={year || ""} onChange={(e) => setYear(parseInt(e.target.value, 10) || 0)} type="number" placeholder="Year" />
            <GlowInput value={content} onChange={(e) => setContent(e.target.value)} placeholder="Question content (min 5 characters)" />
          <GlowButton type="button" onClick={submitQuestion}>
            Post Question
          </GlowButton>
        </GlassCard>
        <div className="space-y-3">
          {questions.map((question) => (
            <GlassCard key={question.id}>
              <p className="text-slate-100">{question.content}</p>
              <p className="text-xs text-slate-400">
                {question.round} · {question.year} · {question.isPremium ? `Premium (${question.creditsToUnlock})` : "Free"}
              </p>
            </GlassCard>
          ))}
          {!questions.length ? <p className="text-sm text-slate-400">No questions yet.</p> : null}
        </div>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </PageWrapper>
  );
}

