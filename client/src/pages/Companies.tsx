import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { GlassCard } from "../components/ui/GlassCard";
import { GlowInput } from "../components/ui/GlowInput";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageTransition } from "../components/layout/PageTransition";

type Company = {
  id: string;
  name: string;
  package: string | null;
  minGpa: number | null;
  roles: string[];
  requiredSkills: string[];
};

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    apiRequest<Company[]>(`/companies${query}`)
      .then(setCompanies)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load companies."));
  }, [search]);

  const packageAnalytics = useMemo(() => {
    const defaultData = [
      { name: "3-6 LPA", count: 0 },
      { name: "6-10 LPA", count: 0 },
      { name: "10-15 LPA", count: 0 },
      { name: "15+ LPA", count: 0 },
    ];
    
    companies.forEach(company => {
      // Very naive package parser for analytics purpose
      if (!company.package) return;
      const amount = parseInt(company.package.replace(/[^0-9]/g, ''));
      if (isNaN(amount)) return;
      if (amount < 6) defaultData[0].count++;
      else if (amount < 10) defaultData[1].count++;
      else if (amount < 15) defaultData[2].count++;
      else defaultData[3].count++;
    });
    
    return defaultData;
  }, [companies]);

  return (
    <PageTransition>
      <PageWrapper title="Companies" subtitle="Search and filter placement opportunities.">
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <GlassCard>
              <h3 className="mb-4 text-slate-100 font-medium">Package Distribution</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={packageAnalytics}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
            
            <GlassCard className="flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-bold text-indigo-400 mb-1">{companies.length}</h3>
                <p className="text-slate-400 text-sm">Total Companies</p>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-2xl font-bold text-emerald-400 mb-1">
                  {companies.filter(c => c.package).length}
                </h3>
                <p className="text-slate-400 text-sm">With Known Packages</p>
              </div>
            </GlassCard>

            <GlassCard className="flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-bold text-cyan-400 mb-1">
                  {companies.filter(c => (c.minGpa ?? 0) <= 6.5).length}
                </h3>
                <p className="text-slate-400 text-sm">Open for ≤ 6.5 GPA</p>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-xl font-bold text-rose-400 mb-1">
                  {Math.round((companies.filter(c => (c.minGpa ?? 0) <= 6.5).length / Math.max(companies.length, 1)) * 100)}%
                </h3>
                <p className="text-slate-400 text-sm">Accessibility Rate</p>
              </div>
            </GlassCard>
          </div>

          <GlassCard>
            <GlowInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company name..." />
          </GlassCard>
          <div className="grid gap-3 md:grid-cols-2">
            {companies.map((company) => (
              <GlassCard key={company.id}>
                <p className="text-lg text-slate-100">{company.name}</p>
                <p className="text-sm text-slate-300">
                  Package: {company.package ?? "TBD"} · Min GPA: {company.minGpa?.toFixed(1) ?? "Any"}
                </p>
                <p className="mt-2 text-xs text-slate-400">{company.roles.join(" · ")}</p>
                <div className="mt-3">
                  <Link to={`/companies/${company.id}`} className="text-sm text-cyan-300">
                    View details
                  </Link>
                </div>
              </GlassCard>
            ))}
            {!companies.length ? <p className="text-sm text-slate-400">No companies found.</p> : null}
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
      </PageWrapper>
    </PageTransition>
  );
}

