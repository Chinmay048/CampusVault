# CampusVault 3.0 — Full Bug Report & GitHub Copilot Fix Prompt

---

## 🔴 CRITICAL BUGS (Blocking)

### 1. TypeScript Build Error — `Dashboard.tsx` line 77
**File:** `client/src/pages/Dashboard.tsx`

**Problem:** The inline type for the `/auth/me` API response uses `branch?: string | null`, but
TypeScript strict mode considers `string | null` incompatible with `string | undefined` in the
`setUser()` call. Also the inline type is missing `targetRoles`, `languages`, and other fields
from `AuthUser`, so the call `setUser(me)` doesn't fully type-check.

**Fix:** Replace the inline type with the imported `AuthUser` type:
```ts
// BEFORE (broken):
apiRequest<{
  id: string;
  email: string;
  name: string;
  credits: number;
  tier: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PLACEMENT_READY";
  branch?: string | null;
  gpa?: number | null;
  strongConcepts?: string[];
}>("/auth/me", { authToken: token })

// AFTER (correct):
apiRequest<AuthUser>("/auth/me", { authToken: token })
```
Add the import at the top if not already there:
```ts
import { useAuthStore, type AuthUser } from "../store/auth";
```

---

### 2. Assessment Fails With Ollama — No Fallback in `assessment.ts`
**File:** `server/src/services/assessment.ts`

**Problem:** `generateQuestions()` throws `"OPENAI_API_KEY is not configured."` immediately when
`OPENAI_API_KEY` is absent. Unlike `analyzer.ts` and `questions.ts` (which correctly fall back
to Ollama), assessment service has **zero Ollama fallback**. This means the Assessment page
always fails for local Ollama users.

**Fix:** Replace the guard:
```ts
// BEFORE (broken — throws immediately):
export async function generateQuestions(topics: string[]) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_API_KEY.startsWith("AIza") ? ... : undefined,
  });
  const model = env.OPENAI_API_KEY.startsWith("AIza") ? "gemini-2.5-flash" : "gpt-4o-mini";
  ...
}

// AFTER (correct — Ollama fallback):
export async function generateQuestions(topics: string[]) {
  const isGemini = env.OPENAI_API_KEY?.startsWith("AIza");
  const useOllama = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes("dummy");

  let client: OpenAI;
  let modelName: string;

  if (!useOllama) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY!,
      ...(isGemini && { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" }),
    });
    modelName = isGemini ? "gemini-2.5-flash" : "gpt-4o-mini";
  } else {
    client = new OpenAI({
      apiKey: "ollama",
      baseURL: env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    });
    modelName = env.OLLAMA_MODEL ?? "llama3";
  }
  // ...rest of function stays same
}
```

---

### 3. Wrong `pdf-parse` Import — Analyzer Crashes on PDF Upload
**File:** `server/src/routes/analyzer.ts` (and `dist/routes/analyzer.js`)

**Problem:** `pdf-parse` has **no named export** called `PDFParse`. The class-based usage
`new PDFParse({ data: buffer })` doesn't exist in that library. This crashes the server the
moment any PDF resume is uploaded.

```ts
// CURRENT BROKEN CODE:
import { PDFParse } from "pdf-parse";
const parser = new PDFParse({ data: req.file.buffer });
const textResult = await parser.getText();
resumeText = textResult.text;

// CORRECT:
import pdfParse from "pdf-parse";
const pdfData = await pdfParse(req.file.buffer);
resumeText = pdfData.text;
```

---

### 4. Hardcoded Wrong Ollama Model Name
**Files:** `server/src/routes/questions.ts`, `server/src/routes/analyzer.ts`

**Problem:** The Ollama fallback uses `modelName = "minimax-m2.7:cloud"` — this is a **cloud
model name**, not a valid Ollama local model. Ollama will reject it. Additionally, the
`questions.ts` `/unlock` route hardcodes `model: "gemini-2.5-flash"` with no fallback at all.

**Fix in all Ollama fallback blocks:**
```ts
// REPLACE:
let modelName = "minimax-m2.7:cloud"; // Wrong — not a local Ollama model

// WITH:
let modelName = env.OLLAMA_MODEL ?? "llama3"; // Dynamic from env
```

**Fix for questions.ts `/unlock` route:**
```ts
// REPLACE completely the OpenAI block:
const isGemini = env.OPENAI_API_KEY?.startsWith("AIza");
const useOllama = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes("dummy");

let client: OpenAI;
let model: string;

if (!useOllama) {
  client = new OpenAI({
    apiKey: env.OPENAI_API_KEY!,
    ...(isGemini && { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" }),
  });
  model = isGemini ? "gemini-2.5-flash" : "gpt-4o-mini";
} else {
  client = new OpenAI({
    apiKey: "ollama",
    baseURL: env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  });
  model = env.OLLAMA_MODEL ?? "llama3";
}
```

---

### 5. `REDIS_URL` Crashes Server on Startup (Redis Not Actually Used)
**File:** `server/src/config/env.ts`

**Problem:** `REDIS_URL` is marked as **required** (`z.string().min(1)`) in the env schema, but
Redis is **not used anywhere** in the code (it's marked "FUTURE IMPLEMENTATION" in comments).
This means the server crashes immediately if `REDIS_URL` is not in `.env`.

**Fix:**
```ts
// BEFORE (crashes if Redis not running):
REDIS_URL: z.string().min(1),

// AFTER (optional since it's not yet implemented):
REDIS_URL: z.string().min(1).optional(),
```

Also add `OLLAMA_BASE_URL` and `OLLAMA_MODEL` to the schema:
```ts
OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434/v1"),
OLLAMA_MODEL: z.string().default("llama3"),
```

---

## 🟡 MEDIUM BUGS (Functional Errors)

### 6. `CompanyDetail.tsx` — TypeScript Error on `options.authToken`
**File:** `client/src/pages/CompanyDetail.tsx`

**Problem:**
```ts
const options: RequestInit & { headers?: Record<string, string> } = {};
if (token) options.authToken = token; // TS Error: authToken doesn't exist on RequestInit
```
`authToken` is a custom property from `lib/api.ts`'s `RequestOptions`, not from `RequestInit`.

**Fix:**
```ts
// BEFORE:
const options: RequestInit & { headers?: Record<string, string> } = {};
if (token) options.authToken = token;
apiRequest<CompanyDetail>(`/companies/${id}`, options)

// AFTER:
apiRequest<CompanyDetail>(`/companies/${id}`, token ? { authToken: token } : {})
```

---

### 7. `AuthUser` Client Type — Missing Fields
**File:** `client/src/store/auth.ts`

**Problem:** The `AuthUser` type is missing `targetRoles`, `languages`, `college`, `year`,
`course`, and `phone` fields. These are accessed in `CompanyDetail.tsx` (prep tab uses
`user.targetRoles`, `user.languages`, `user.strongConcepts`) without TypeScript complaining
only because the accesses use optional chaining. But the store type doesn't match the server's
`/auth/me` response, causing stale data issues.

**Fix:**
```ts
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  tier: Tier;
  credits: number;
  branch?: string | null;
  gpa?: number | null;
  strongConcepts?: string[];
  // ADD THESE:
  targetRoles?: string[];
  languages?: string[];
  college?: string | null;
  course?: string | null;
  year?: number | null;
  phone?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  leetcodeUrl?: string | null;
};
```

---

### 8. `auth.ts` Server — Unused Import of `addCredits`
**File:** `server/src/routes/auth.ts`

**Problem:** `import { addCredits } from "../services/credits.js";` is present but `addCredits`
is never called. The registration creates a `CreditTransaction` log entry but doesn't actually
call `addCredits()` because the Prisma schema gives 100 credits by default. The import is dead
weight and causes confusion.

**Fix:** Remove the import:
```ts
// Remove this line:
import { addCredits } from "../services/credits.js";
```

---

### 9. `verify-answer` Route — Credits Awarded Even When AI Returns Wrong Format
**File:** `server/src/routes/questions.ts`

**Problem:** When the AI returns a non-JSON response, `result.isCorrect` defaults to `false` —
which is fine. But the explanation parsing is fragile. If `raw` contains the JSON embedded in
markdown (which Ollama sometimes does), the cleanup tries to strip it, but the regex only
strips triple backtick code fences. If Ollama returns `Here is the JSON: {...}` without
backticks, the `JSON.parse()` fails and the user gets a cryptic error.

**Fix:** More robust JSON extraction:
```ts
const cleaned = raw
  .replace(/```json[\s\S]*?```/gi, (match) => match.replace(/```json|```/gi, ""))
  .replace(/^[^{[]*/, "") // strip preamble before first { or [
  .replace(/[^}\]]*$/, "") // strip postamble after last } or ]
  .trim();
```

---

### 10. `Forum.tsx` — Company Dropdown Doesn't Auto-Select First Company
**File:** `client/src/pages/Forum.tsx`

**Problem:** `companyId` state initializes to `""`. If the user submits without selecting a
company, the backend correctly rejects with "Please select a company", but the UI shows no
feedback about which field is wrong. Also, the select doesn't reset after a successful post.

**Fix:** Reset `companyId` after successful post (already done for `content` but not
`companyId`). Also show a proper validation message.

---

### 11. `Analyzer.tsx` — GlowInput Used for Resume Text (Should Be Textarea)
**File:** `client/src/pages/Analyzer.tsx`

**Problem:** The resume text paste area uses `<GlowInput>` which renders an `<input>` element.
Pasting multi-line resume text into a single-line input loses all newlines.

**Fix:** Replace with a `<textarea>`:
```tsx
<textarea
  value={resumeText}
  onChange={(e) => setResumeText(e.target.value)}
  placeholder="Paste resume text if you prefer..."
  rows={6}
  className="glow-ring w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 resize-none"
/>
```

---

### 12. No 404 Route in Router
**File:** `client/src/router.tsx`

**Problem:** There's no catch-all `*` route, so navigating to an unknown URL shows a blank page.

**Fix:**
```tsx
{ path: "*", element: <Navigate to="/" replace /> }
// or a proper NotFound page
```

---

## 🟢 DYNAMIC / HARDCODING ISSUES (Nothing Should Be Hardcoded)

### 13. Bundle Cost Hardcoded to 10 Credits
**Files:** `server/src/routes/companies.ts`, `client/src/pages/CompanyDetail.tsx`

Both sides hardcode `bundleCost = 10`. If you ever want to change pricing, you'd need to update
both files separately.

**Fix:** Return `bundleCostCredits` from the server in the response and read it on the client:
```ts
// server/src/routes/companies.ts:
const BUNDLE_COST = parseInt(env.COMPANY_BUNDLE_COST ?? "10", 10);

// server/src/config/env.ts:
COMPANY_BUNDLE_COST: z.string().optional().default("10"),
```
Client button text `"Buy Bundle (10 Credits)"` should read from the API response.

---

### 14. Register Page — Roles, Languages, Concepts Hardcoded
**File:** `client/src/pages/Register.tsx`

```ts
const roles = ["SWE", "Data Analyst", "DevOps", "ML Engineer", "Frontend Dev"];
const languages = ["Python", "Java", "C++", "JavaScript", "Go"];
const concepts = ["DSA", "DBMS", "OS", "CN", "System Design", "ML"];
```

These lists should be fetched from the server or at minimum from a config endpoint so they're
consistent with whatever the assessment service expects.

**Fix:** Create a `GET /api/config/options` endpoint returning these lists from constants shared
across the codebase.

---

### 15. Assessment Timer Hardcoded to 20 Minutes
**File:** `client/src/pages/Assessment.tsx`

`const [remainingSec, setRemainingSec] = useState(20 * 60);` and subtitle says "20-minute timer"
hardcoded.

**Fix:** Have the server return `timeLimitSeconds` alongside `questions`, then the client reads:
```ts
const [remainingSec, setRemainingSec] = useState<number>(data.timeLimitSeconds ?? 20 * 60);
```

---

## 🚀 GITHUB COPILOT PROMPT

Paste this directly into GitHub Copilot Chat (or a chat-capable AI assistant with your codebase open):

---

```
You are fixing a full-stack TypeScript project called CampusVault 3.0.
Stack: React 19 + Vite (client), Express 5 + Prisma + PostgreSQL (server), Ollama for local AI.
Fix ALL the following issues. Make sure NOTHING is hardcoded — use env vars for all config values.

=== FIX 1: TypeScript Build Error — client/src/pages/Dashboard.tsx ===
The build fails with: "Type 'string | null' is not assignable to type 'string | undefined'".
In DashboardPage's first useEffect, replace the inline type in the apiRequest call with the
imported AuthUser type. Change:
  apiRequest<{ id: string; email: string; ...(inline object)... }>("/auth/me", ...)
To:
  apiRequest<AuthUser>("/auth/me", { authToken: token })
Make sure AuthUser is imported from "../store/auth".

=== FIX 2: Update client/src/store/auth.ts — AuthUser type is incomplete ===
Add these missing fields to the AuthUser type:
  targetRoles?: string[];
  languages?: string[];
  college?: string | null;
  course?: string | null;
  year?: number | null;
  phone?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  leetcodeUrl?: string | null;

=== FIX 3: Add OLLAMA env vars to server/src/config/env.ts ===
Add these to the Zod schema (they must be optional with defaults):
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434/v1"),
  OLLAMA_MODEL: z.string().default("llama3"),
Also make REDIS_URL optional (it is marked as "FUTURE IMPLEMENTATION" and not actually used):
  REDIS_URL: z.string().min(1).optional(),
Also add (optional, for dynamic bundle pricing):
  COMPANY_BUNDLE_COST: z.coerce.number().int().positive().default(10),

=== FIX 4: Assessment service Ollama fallback — server/src/services/assessment.ts ===
The generateQuestions function throws immediately when OPENAI_API_KEY is absent.
Rewrite it to mirror the pattern used in questions.ts and analyzer.ts:
- If OPENAI_API_KEY is set and doesn't include "dummy" → use OpenAI/Gemini
- Else → fall back to Ollama at env.OLLAMA_BASE_URL with model env.OLLAMA_MODEL
Remove the early throw "OPENAI_API_KEY is not configured." entirely.

=== FIX 5: Fix pdf-parse import — server/src/routes/analyzer.ts ===
The current code uses: import { PDFParse } from "pdf-parse" which doesn't exist.
Replace with:
  import pdfParse from "pdf-parse";
And replace the usage:
  const parser = new PDFParse({ data: req.file.buffer });
  const textResult = await parser.getText();
  resumeText = textResult.text;
With:
  const pdfData = await pdfParse(req.file.buffer);
  resumeText = pdfData.text;

=== FIX 6: Fix wrong Ollama model name in all routes ===
In server/src/routes/questions.ts and server/src/routes/analyzer.ts, the Ollama fallback
currently sets: let modelName = "minimax-m2.7:cloud";
This is a cloud model name, NOT a local Ollama model. Replace with:
  let modelName = env.OLLAMA_MODEL ?? "llama3";
Also in questions.ts, the /unlock route hardcodes model: "gemini-2.5-flash".
Refactor the entire OpenAI client + model selection block in that route to use the same
conditional pattern (OpenAI/Gemini vs Ollama fallback) as the verify-answer route.

=== FIX 7: Fix CompanyDetail.tsx TypeScript error on options.authToken ===
In client/src/pages/CompanyDetail.tsx, replace:
  const options: RequestInit & { headers?: Record<string, string> } = {};
  if (token) options.authToken = token;
  apiRequest<CompanyDetail>(`/companies/${id}`, options)
With:
  apiRequest<CompanyDetail>(`/companies/${id}`, token ? { authToken: token } : {})

=== FIX 8: Make bundle cost dynamic ===
In server/src/routes/companies.ts:
  const bundleCost = 10;
Replace with:
  const bundleCost = env.COMPANY_BUNDLE_COST;
In the /unlock-bundle response, include the cost so clients don't hardcode it:
  return res.json({ success: true, creditsSpent: ..., bundleCost, refetchedCompany: ... });
In client/src/pages/CompanyDetail.tsx, update the button text to use the returned bundleCost
from the company fetch response (add bundleCost field to the CompanyDetail type).

=== FIX 9: Fix Analyzer textarea ===
In client/src/pages/Analyzer.tsx, the resume text input is a GlowInput (single-line input).
Replace it with a <textarea> element that has rows={6}, same styling as GlowInput but using
the textarea tag. This is needed because resume text is multi-line.

=== FIX 10: Add 404 route ===
In client/src/router.tsx, add a catch-all route at the end:
  { path: "*", element: <Navigate to="/" replace /> }
Import Navigate from react-router-dom.

=== FIX 11: Remove unused addCredits import in auth.ts ===
In server/src/routes/auth.ts, remove the unused import:
  import { addCredits } from "../services/credits.js";

=== FIX 12: Make assessment timer dynamic ===
In server/src/routes/assessment.ts, the POST /generate endpoint should return:
  return res.json({ questions, timeLimitSeconds: 20 * 60 });
In client/src/pages/Assessment.tsx, read the timer from the response:
  .then((data) => {
    setQuestions(data.questions);
    setRemainingSec(data.timeLimitSeconds ?? 20 * 60);
    setAnswers(new Array(data.questions.length).fill(""));
  })
Update the Question type on the client to: { questions: Question[]; timeLimitSeconds: number }

=== FIX 13: Add a .env.example file in the root ===
Create a file at .env.example (next to .gitignore) with these keys (no real values):
  DATABASE_URL=postgresql://user:password@localhost:5432/campusvault
  JWT_SECRET=your-jwt-secret-here
  JWT_REFRESH_SECRET=your-refresh-secret-here
  OPENAI_API_KEY=                        # Optional: set to a Gemini or OpenAI key
  REDIS_URL=                             # Optional: future implementation
  CLIENT_URL=http://localhost:5173
  PORT=3001
  OLLAMA_BASE_URL=http://localhost:11434/v1
  OLLAMA_MODEL=llama3
  COMPANY_BUNDLE_COST=10

After ALL fixes, run: cd server && npm run build
And verify: cd client && npx tsc --noEmit
Both should produce zero errors.
```

---

## Summary Table

| # | File | Severity | Issue |
|---|------|----------|-------|
| 1 | `client/src/pages/Dashboard.tsx` | 🔴 CRITICAL | TS build error — inline type vs AuthUser |
| 2 | `server/src/services/assessment.ts` | 🔴 CRITICAL | No Ollama fallback — throws without API key |
| 3 | `server/src/routes/analyzer.ts` | 🔴 CRITICAL | Wrong pdf-parse import crashes on PDF upload |
| 4 | `server/src/routes/questions.ts` + `analyzer.ts` | 🔴 CRITICAL | Wrong Ollama model name (cloud model used) |
| 5 | `server/src/config/env.ts` | 🔴 CRITICAL | REDIS_URL required but Redis not implemented |
| 6 | `client/src/pages/CompanyDetail.tsx` | 🟡 MEDIUM | TypeScript error on options.authToken |
| 7 | `client/src/store/auth.ts` | 🟡 MEDIUM | AuthUser type missing fields |
| 8 | `server/src/routes/auth.ts` | 🟡 MEDIUM | Unused addCredits import |
| 9 | `server/src/routes/questions.ts` | 🟡 MEDIUM | /unlock hardcodes "gemini-2.5-flash" |
| 10 | `client/src/pages/Analyzer.tsx` | 🟡 MEDIUM | GlowInput instead of textarea for resume |
| 11 | `client/src/router.tsx` | 🟡 MEDIUM | No 404 catch-all route |
| 12 | `server/src/routes/companies.ts` | 🟢 HARDCODED | Bundle cost hardcoded to 10 |
| 13 | `client/src/pages/Register.tsx` | 🟢 HARDCODED | Roles/languages/concepts lists hardcoded |
| 14 | `client/src/pages/Assessment.tsx` | 🟢 HARDCODED | Timer hardcoded to 20 minutes |
