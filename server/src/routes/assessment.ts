import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { generateQuestions, resolveTier } from "../services/assessment.js";

const generateSchema = z.object({
  topics: z.array(z.string()).default([]),
});

const submitSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      correct: z.enum(["A", "B", "C", "D"]),
      topic: z.string(),
    }),
  ),
  answers: z.array(z.enum(["A", "B", "C", "D", ""])),
});

export const assessmentRouter = Router();

assessmentRouter.post("/generate", requireAuth, async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid assessment request." });
  }

  try {
    const questions = await generateQuestions(parsed.data.topics);
    return res.json({ questions, timeLimitSeconds: 20 * 60 });
  } catch (error) {
    return res.status(503).json({
      message: error instanceof Error ? error.message : "Unable to generate questions.",
    });
  }
});

assessmentRouter.post("/submit", requireAuth, async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid submission payload." });
  }

  const auth = (req as AuthedRequest).auth;
  if (!auth) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const score = parsed.data.questions.reduce((acc, question, index) => {
    return parsed.data.answers[index] === question.correct ? acc + 1 : acc;
  }, 0);

  const tier = resolveTier(score);
  const topics = [...new Set(parsed.data.questions.map((q) => q.topic))];

  // Credit adjustment based on performance
  // Perfect score: +20 bonus, 80%+: +10, 60%+: +5, <60%: -5
  const scorePercentage = (score / parsed.data.questions.length) * 100;
  let creditAdjustment = 0;
  if (scorePercentage === 100) {
    creditAdjustment = 20;
  } else if (scorePercentage >= 80) {
    creditAdjustment = 10;
  } else if (scorePercentage >= 60) {
    creditAdjustment = 5;
  } else {
    creditAdjustment = -5;
  }

  const assessment = await prisma.$transaction(async (tx) => {
    // Update user tier
    await tx.user.update({
      where: { id: auth.id },
      data: { tier },
    });

    // Adjust credits based on performance
    const user = await tx.user.findUnique({
      where: { id: auth.id },
      select: { credits: true },
    });

    const newCreditAmount = Math.max(0, (user?.credits ?? 0) + creditAdjustment);
    await tx.user.update({
      where: { id: auth.id },
      data: { credits: newCreditAmount },
    });

    // Log credit transaction
    await tx.creditTransaction.create({
      data: {
        userId: auth.id,
        amount: creditAdjustment,
        reason: `Assessment: ${score}/${parsed.data.questions.length} (${scorePercentage.toFixed(0)}%)`,
      },
    });

    return tx.assessment.create({
      data: {
        userId: auth.id,
        score,
        totalQ: parsed.data.questions.length,
        topics,
        tier,
        answers: parsed.data.answers,
      },
      select: {
        id: true,
        score: true,
        totalQ: true,
        tier: true,
        takenAt: true,
      },
    });
  });

  return res.json(assessment);
});

