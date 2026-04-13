import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { env } from "../config/env.js";

export const companiesRouter = Router();

companiesRouter.get("/", async (req, res) => {
  const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;
  const gpa = typeof req.query.gpa === "string" ? Number(req.query.gpa) : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  const companies = await prisma.company.findMany({
    where: {
      ...(branch ? { eligibleBranches: { has: branch } } : {}),
      ...(typeof gpa === "number" && Number.isFinite(gpa)
        ? {
            OR: [{ minGpa: { lte: gpa } }, { minGpa: null }],
          }
        : {}),
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return res.json(companies);
});

companiesRouter.get("/:id", optionalAuth, async (req, res) => {
  const auth = (req as AuthedRequest).auth;
  
  const companyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  let hasUnlockedBundle = false;
  if (auth) {
    const unlock = await prisma.companyUnlock.findFirst({
      where: { companyId, userId: auth.id }
    });
    hasUnlockedBundle = !!unlock;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      questions: {
        select: {
          id: true,
          content: true,
          round: true,
          year: true,
          isPremium: true,
          answers: hasUnlockedBundle ? { select: { content: true } } : false,
        },
      },
    },
  });

  if (!company) {
    return res.status(404).json({ message: "Company not found." });
  }

  return res.json({ ...company, hasUnlockedBundle });
});

companiesRouter.post("/:id/unlock-bundle", requireAuth, async (req, res) => {
  const auth = (req as AuthedRequest).auth;
  if (!auth) return res.status(401).json({ message: "Unauthorized." });
  const companyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const bundleCost = env.COMPANY_BUNDLE_COST;

  try {
    let alreadyUnlocked = false;
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: auth.id } });
      if (!user || user.credits < bundleCost) throw new Error("Insufficient credits to unlock company bundle.");
      
      const existingUnlock = await tx.companyUnlock.findUnique({
        where: { companyId_userId: { companyId, userId: auth.id } }
      });

      if (existingUnlock) {
        alreadyUnlocked = true;
        return;
      }

      await tx.user.update({
        where: { id: auth.id },
        data: { credits: { decrement: bundleCost } }
      });

      await tx.creditTransaction.create({
        data: {
          userId: auth.id,
          amount: -bundleCost,
          reason: `Unlocked company bundle for ${companyId}`
        }
      });

      await tx.companyUnlock.create({
        data: { companyId, userId: auth.id, cost: bundleCost }
      });
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        questions: {
          select: {
            id: true,
            content: true,
            round: true,
            year: true,
            isPremium: true,
            answers: { select: { content: true } },
          },
        },
      },
    });

    return res.json({ 
      success: true, 
      creditsSpent: alreadyUnlocked ? 0 : bundleCost,
      refetchedCompany: { ...company, hasUnlockedBundle: true }
    });

  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unlock failed" });
  }
});

companiesRouter.get("/:id/questions", async (req, res) => {
  const questions = await prisma.question.findMany({
    where: { companyId: req.params.id },
    orderBy: { year: "desc" },
  });
  return res.json(questions);
});

