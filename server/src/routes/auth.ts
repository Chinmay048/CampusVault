import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "../services/auth.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional().or(z.literal("")),
  college: z.string().optional().or(z.literal("")),
  course: z.string().optional().or(z.literal("")),
  branch: z.string().optional().or(z.literal("")),
  year: z.number().int().min(0).max(5).optional().nullable().or(z.string().transform(() => undefined)).or(z.nan().transform(() => undefined)),
  gpa: z.number().min(0).max(10).optional().nullable().or(z.string().transform(() => undefined)).or(z.nan().transform(() => undefined)),
  githubUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  leetcodeUrl: z.string().url().optional().or(z.literal("")),
  targetRoles: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  strongConcepts: z.array(z.string()).default([]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid registration payload." });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return res.status(409).json({ message: "Email already in use." });
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        phone: parsed.data.phone,
        college: parsed.data.college,
        course: parsed.data.course,
        branch: parsed.data.branch,
        year: parsed.data.year,
        gpa: parsed.data.gpa,
        githubUrl: parsed.data.githubUrl,
        linkedinUrl: parsed.data.linkedinUrl,
        leetcodeUrl: parsed.data.leetcodeUrl,
        passwordHash: await hashPassword(parsed.data.password),
        targetRoles: parsed.data.targetRoles,
        languages: parsed.data.languages,
        strongConcepts: parsed.data.strongConcepts,
      },
      select: { id: true, email: true, name: true, tier: true, credits: true },
    });
    // Create an initial credit transaction log for the default 100 credits without giving extra
    await tx.creditTransaction.create({
      data: { userId: created.id, amount: 100, reason: "Registration welcome bonus" },
    });
    return created;
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return res.status(201).json({ user, accessToken, refreshToken });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid login payload." });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return res.json({
    user: { id: user.id, email: user.email, name: user.name, tier: user.tier, credits: user.credits },
    accessToken,
    refreshToken,
  });
});

authRouter.post("/refresh", async (req, res) => {
  const token = req.body?.refreshToken;
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ message: "refreshToken is required." });
  }

  const payload = await verifyRefreshToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid refresh token." });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, tier: true, credits: true },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid refresh token." });
  }

  const accessToken = signAccessToken(user);
  return res.json({ accessToken });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const auth = (req as AuthedRequest).auth;
  if (!auth) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      credits: true,
      tier: true,
      gpa: true,
      course: true,
      branch: true,
      year: true,
      college: true,
      linkedinUrl: true,
      githubUrl: true,
      leetcodeUrl: true,
      targetRoles: true,
      languages: true,
      strongConcepts: true,
    },
  });
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  return res.json(user);
});

