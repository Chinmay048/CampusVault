import { useState, useRef } from "react";
import { GlassCard } from "../components/ui/GlassCard";
import { GlowButton } from "../components/ui/GlowButton";
import { GlowInput } from "../components/ui/GlowInput";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useAuthStore } from "../store/auth";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

type AnalyzerResult = {
  profileScore: {
    projects: number;
    skills: number;
    dsa: number;
    communication: number;
    experience: number;
  };
  salaryRange: string;
  gaps: string[];
};

export function AnalyzerPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzerResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runAnalysis = async () => {
    if (!token) {
      setMessage("Login required.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (resumeText) formData.append("resumeText", resumeText);
      if (resumeFile) formData.append("resumePdf", resumeFile);

      // Using raw fetch since we are sending FormData instead of JSON
      const res = await fetch(`/api/analyzer/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Analyzer failed.");
      }

      const data = await res.json();
      setResult(data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Analyzer failed.");  
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? [
        { subject: "Projects", A: result.profileScore.projects, fullMark: 100 },
        { subject: "Skills", A: result.profileScore.skills, fullMark: 100 },
        { subject: "DSA", A: result.profileScore.dsa, fullMark: 100 },
        { subject: "Communication", A: result.profileScore.communication, fullMark: 100 },
        { subject: "Experience", A: result.profileScore.experience, fullMark: 100 },
      ]
    : [];

  return (
    <PageWrapper title="AI Market Value Analyzer" subtitle="Phase 2: Resume analysis and salary estimation.">
      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Upload PDF Resume</label>
            <input 
              type="file" 
              accept=".pdf" 
              ref={fileInputRef}
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-400 hover:file:bg-indigo-400/30"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0a0a12] px-2 text-slate-400">or paste text</span>
            </div>
          </div>
          <div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume text if you prefer..."
              rows={6}
              className="glow-ring w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 resize-none"
            />
          </div>
          <GlowButton type="button" onClick={runAnalysis} className={loading ? "opacity-50" : ""}>
            {loading ? "Analyzing..." : "Analyze Now"}
          </GlowButton>
          {message ? <p className="text-sm text-rose-300">{message}</p> : null}
        </GlassCard>

        {result ? (
          <div className="space-y-4">
            <GlassCard>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="text-slate-300">Estimated Tech Salary</p>
                <p className="text-2xl font-bold text-emerald-400">{result.salaryRange}</p>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-sm text-slate-300 font-medium">Profile Radar</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Score"
                        dataKey="A"
                        stroke="#6366f1"
                        fill="#818cf8"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>
            <GlassCard>
              <p className="mb-2 font-medium text-slate-100">Top Gaps & Action Plan</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                {result.gaps.map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            </GlassCard>
          </div>
        ) : null}
      </div>
    </PageWrapper>
  );
}

