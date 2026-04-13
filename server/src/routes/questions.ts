import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, optionalAuth, type AuthedRequest } from "../middleware/auth.js";
import { addCredits, spendCredits } from "../services/credits.js";
import OpenAI from "openai";
import { env } from "../config/env.js";

const createQuestionSchema = z.object({
  companyId: z.string().min(1, "Please select a company"),
  content: z.string().min(5, "Question must be at least 5 characters"),
  round: z.string().min(1, "Round is required"),
  year: z.number().int().min(2000, "Valid year is required").max(2100),
});

const createAnswerSchema = z.object({
  content: z.string().min(10),
  isPremium: z.boolean().default(false),
  creditsToUnlock: z.number().int().min(10).max(50).optional(),
});

export const questionsRouter = Router();

questionsRouter.get("/", async (req, res) => {
  const companyId = typeof req.query.companyId === "string" ? req.query.companyId : undefined;
  const round = typeof req.query.round === "string" ? req.query.round : undefined;
  const year = typeof req.query.year === "string" ? Number(req.query.year) : undefined;

  const questions = await prisma.question.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(round ? { round } : {}),
      ...(Number.isFinite(year) ? { year } : {}),
    },
    orderBy: [{ year: "desc" }, { id: "desc" }],
  });

  return res.json(questions);
});

questionsRouter.post("/", requireAuth, async (req, res) => {
  const auth = (req as AuthedRequest).auth;
  if (!auth) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  const parsed = createQuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues.map((e: any) => e.message).join(", ") });
  }

  const question = await prisma.question.create({
    data: {
      companyId: parsed.data.companyId,
      postedById: auth.id,
      content: parsed.data.content,
      round: parsed.data.round,
      year: parsed.data.year,
    },
  });
  return res.status(201).json(question);
});

questionsRouter.get("/:id/answers", optionalAuth, async (req, res) => {
  const questionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!questionId) {
    return res.status(400).json({ message: "Invalid question id." });
  }
  const auth = (req as AuthedRequest).auth;
  const answers = await prisma.answer.findMany({
    where: { questionId },
    orderBy: [{ upvotes: "desc" }, { id: "desc" }],
    include: {
      unlocks: auth ? {
        where: { userId: auth.id }
      } : false,
    },
  });

  const redactedAnswers = answers.map((answer) => {
    const hasUnlocked = answer.unlocks?.length > 0;
    const isOwner = auth?.id === answer.userId;
    
    // Drop unlocks before sending response
    const { unlocks, ...cleanedAnswer } = answer;

    if (answer.isPremium && !hasUnlocked && !isOwner) {
      return {
        ...cleanedAnswer,
        content: "This answer is premium. Unlock it to view the content.",
      };
    }
    return cleanedAnswer;
  });

  return res.json(redactedAnswers);
});

questionsRouter.post("/:id/answers", requireAuth, async (req, res) => {
  const questionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!questionId) {
    return res.status(400).json({ message: "Invalid question id." });
  }
  const auth = (req as AuthedRequest).auth;
  if (!auth) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  const parsed = createAnswerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid answer payload." });
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) {
    return res.status(404).json({ message: "Question not found." });
  }

  const answer = await prisma.$transaction(async (tx) => {
    const created = await tx.answer.create({
      data: {
        questionId,
        userId: auth.id,
        content: parsed.data.content,
        isPremium: parsed.data.isPremium,
        creditsToUnlock: parsed.data.isPremium ? parsed.data.creditsToUnlock ?? 10 : 0,
      },
    });

    if (parsed.data.isPremium) {
      await tx.question.update({
        where: { id: questionId },
        data: { isPremium: true },
      });
    } else {
      await addCredits(tx, auth.id, 10, "Posted answer reward");
    }
    return created;
  });

  return res.status(201).json(answer);
});


questionsRouter.post("/:id/unlock", requireAuth, async (req, res) => {
  const questionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!questionId) return res.status(400).json({ message: "Invalid question id." });
  const auth = (req as AuthedRequest).auth;
  if (!auth) return res.status(401).json({ message: "Unauthorized." });

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { company: true },
  });
  if (!question || !question.isPremium) return res.status(400).json({ message: "Question is not premium." });

  try {
    const cost = question.creditsToUnlock > 0 ? question.creditsToUnlock : 20;

    let alreadyUnlocked = false;
    let needsGeneration = false;

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: auth.id } });
      if (!user || user.credits < cost) throw new Error("Insufficient credits to unlock.");
      
      const existingUnlock = await tx.answerUnlock.findFirst({
        where: { userId: auth.id, answer: { questionId } }
      });
      if (existingUnlock) {
        alreadyUnlocked = true;
        return; // Already unlocked
      }

      await spendCredits(tx, auth.id, cost, `Unlocked premium answer for question.`);
      
      // Let's create the Answer in DB to persist the unlocked data
      const existingAnswer = await tx.answer.findFirst({ where: { questionId } });
      if (!existingAnswer) {
        // Will generate answer below, but we need an Answer record to attach AnswerUnlock to.
        needsGeneration = true;
      } else {
        await tx.answerUnlock.create({
          data: {
            answerId: existingAnswer.id,
            userId: auth.id,
            cost
          }
        });
      }
    });
    
    if (alreadyUnlocked) {
      const unlockedAnswer = await prisma.answer.findFirst({ where: { questionId } });
      return res.status(200).json({ unlockedAnswer: unlockedAnswer?.content || "Previously unlocked content.", creditsSpent: 0 });
    }

    if (!needsGeneration) {
      const unlockedAnswer = await prisma.answer.findFirst({ where: { questionId } });
      return res.status(200).json({ unlockedAnswer: unlockedAnswer?.content || "Previously unlocked content.", creditsSpent: cost });
    }
    
    // Generate AI answer dynamically to act as the "unlocked premium content"
    const isGemini = env.OPENAI_API_KEY?.startsWith("AIza");
    const useOllama = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes("dummy");

    let client: OpenAI;
    let model: string;

    if (!useOllama) {
      client = new OpenAI({
        apiKey: env.OPENAI_API_KEY!,
        ...(isGemini && { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" })
      });
      model = isGemini ? "gemini-2.5-flash" : "gpt-4o-mini";
    } else {
      client = new OpenAI({
        apiKey: "ollama",
        baseURL: env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1"
      });
      model = env.OLLAMA_MODEL ?? "llama3";
    }
    
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are a senior tech interviewer at top tech companies. Provide a comprehensive, detailed, and stellar answer or breakdown (with code examples if technical) for the provided interview question." },
        { role: "user", content: `Company: ${question.company.name}\nQuestion: ${question.content}` }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const generatedContent = completion.choices[0]?.message?.content || "Sample premium answer generated by AI expert.";

    // Save as answer to persist it
    const createdAnswer = await prisma.answer.create({
      data: {
        questionId,
        userId: auth.id,
        content: generatedContent,
        isPremium: true,
        creditsToUnlock: cost
      }
    });
    
    await prisma.answerUnlock.create({
      data: {
        answerId: createdAnswer.id,
        userId: auth.id,
        cost
      }
    });

    return res.status(200).json({ unlockedAnswer: generatedContent, creditsSpent: cost });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unlock failed." });
  }
});



questionsRouter.post("/:id/verify-answer", requireAuth, async (req, res) => {
  const qId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { answer } = req.body;
  const auth = (req as any).auth;
  if (!auth) return res.status(401).json({ message: "Unauthorized" });

  const question = await prisma.question.findUnique({ where: { id: qId } });
  if (!question) return res.status(404).json({ message: "Question not found" });

  try {
    const isGemini = env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith("AIza");
    const useOllama = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes("dummy");
    let client: OpenAI;
    let modelName: string;

    if (!useOllama) {
      client = new OpenAI({
        apiKey: env.OPENAI_API_KEY!,
        ...(isGemini && { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" })
      });
      modelName = isGemini ? "gemini-2.5-flash" : "gpt-4o-mini";
    } else {
      client = new OpenAI({ 
        apiKey: "ollama",
        baseURL: env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1"
      });
      modelName = env.OLLAMA_MODEL ?? "llama3";
    }

    const promptParams = {
      question: question.content,
      type: question.type,
      correctAnswer: question.correctAnswer,
      expectedOutput: question.expectedOutput,
      userAnswer: answer
    };

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: 'You are an interviewer verifying an answer. Given the question details and user answer, evaluate correctness. Return ONLY valid JSON with no markdown formatting: { "isCorrect": boolean, "explanation": "reasoning" }.'
        },
        {
          role: "user",
          content: JSON.stringify(promptParams)
        }
      ]
    });
    
    const raw = completion.choices[0]?.message?.content;
    let result = { isCorrect: false, explanation: "Failed to parse AI response." }; 
    if (raw) {
        try {
          const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
          const p = JSON.parse(cleaned);
          if (typeof p.isCorrect === 'boolean') result.isCorrect = p.isCorrect;
          if (p.explanation) result.explanation = p.explanation;
        } catch (e) {
          result.explanation = "AI provided a non-JSON formatted response: " + raw.substring(0, 100) + "...";
        }
    }

    if (result.isCorrect) {
      await prisma.$transaction(async (tx) => {
          await addCredits(tx, auth.id, 5, "Correct verified answer for question " + qId);        
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("Verify error:", error);
    return res.status(500).json({ message: "Verification failed" });
  }
});
