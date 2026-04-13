import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { GlassCard } from "../components/ui/GlassCard";
import { GlowButton } from "../components/ui/GlowButton";
import { ProgressRing } from "../components/ui/ProgressRing";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useAuthStore, type AuthUser } from "../store/auth";
import { PageTransition } from "../components/layout/PageTransition";

type Question = {
  question: string;
  options: [string, string, string, string];
  correct: "A" | "B" | "C" | "D";
  topic: string;
};

type AssessmentResponse = {
  questions: Question[];
  timeLimitSeconds: number;
};

export function AssessmentPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [remainingSec, setRemainingSec] = useState(20 * 60);
  const [totalTimeSec, setTotalTimeSec] = useState(20 * 60);

  useEffect(() => {
    if (!token) {
      return;
    }
    apiRequest<AssessmentResponse>("/assessment/generate", {
      method: "POST",
      authToken: token,
      body: JSON.stringify({ topics: user?.strongConcepts ?? [] }),
    })
      .then((data) => {
        setQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(""));
        const timeLimitSeconds = data.timeLimitSeconds ?? 20 * 60;
        setRemainingSec(timeLimitSeconds);
        setTotalTimeSec(timeLimitSeconds);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load assessment."))
      .finally(() => setIsLoaded(true));
  }, [token, user?.strongConcepts]);

  useEffect(() => {
    if (!questions.length) {
      return;
    }
    const timer = setInterval(() => {
      setRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [questions.length]);

  const currentQuestion = useMemo(() => questions[current], [questions, current]);

  const submitAssessment = async () => {
    if (!token || !questions.length) {
      return;
    }
    try {
      const result = await apiRequest<{ score: number; totalQ: number; tier: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PLACEMENT_READY" }>("/assessment/submit", {
        method: "POST",
        authToken: token,
        body: JSON.stringify({ questions, answers }),
      });
      
      // Refresh user data to get updated credits
      const updatedUser = await apiRequest<AuthUser>("/auth/me", { authToken: token });
      setUser(updatedUser);
      
      setMessage(`Assessment submitted. Score: ${result.score}/${result.totalQ}. Tier: ${result.tier}`);
      navigate("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submit failed.");    
    }
  };

  return (
    <PageTransition>
      <PageWrapper title="Assessment" subtitle="15-question AI-generated test with 20-minute timer.">
        <GlassCard>
          {!isLoaded ? <p>Generating your questions...</p> : null}
          {!token ? <p>Please register/login first.</p> : null}
          {isLoaded && token && !questions.length ? <p>No questions available.</p> : null}
          {currentQuestion ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">
                Question {current + 1} / {questions.length}
              </p>
              <ProgressRing total={totalTimeSec} remaining={remainingSec} />
            </div>
            <h3 className="text-xl text-slate-50">{currentQuestion.question}</h3>
            <div className="grid gap-2">
              {currentQuestion.options.map((option, idx) => {
                const choice = (["A", "B", "C", "D"] as const)[idx];
                const selected = answers[current] === choice;
                return (
                  <button
                    key={`${currentQuestion.question}-${choice}`}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => {
                        const copy = [...prev];
                        copy[current] = choice;
                        return copy;
                      })
                    }
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                      selected
                        ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100"
                        : "border-white/20 bg-black/20 text-slate-300"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-100"
                onClick={() => setCurrent((prev) => Math.max(0, prev - 1))}
              >
                Previous
              </button>
              {current < questions.length - 1 ? (
                <GlowButton type="button" onClick={() => setCurrent((prev) => Math.min(questions.length - 1, prev + 1))}>
                  Next
                </GlowButton>
              ) : (
                <GlowButton type="button" onClick={submitAssessment}>
                  Submit Assessment
                </GlowButton>
              )}
            </div>
          </div>
        ) : null}
        {message ? <p className="mt-3 text-sm text-slate-200">{message}</p> : null}
      </GlassCard>
    </PageWrapper>
    </PageTransition>
  );
}

