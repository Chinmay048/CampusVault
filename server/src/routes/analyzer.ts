import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
import { createRequire } from "module";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";        
import { prisma } from "../lib/prisma.js";
import { spendCredits } from "../services/credits.js";
import { env } from "../config/env.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });

export const analyzerRouter = Router();

analyzerRouter.post("/run", requireAuth, upload.single("resumePdf"), async (req, res) => {
  const auth = (req as AuthedRequest).auth;
  if (!auth) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  
  let resumeText = req.body.resumeText || "";
  
  if (req.file && req.file.buffer) {
    try {
      const parser = new pdfParse.PDFParse(new Uint8Array(req.file.buffer));
      const pdfData = await parser.getText();
      resumeText = pdfData.text || "";
    } catch (err) {
      console.error("PDF Parsing Error:", err);
      return res.status(400).json({ message: "Could not parse the provided PDF file." });
    }
  }

  if (resumeText.length < 10) {
    return res.status(400).json({ message: "Provide either a valid resume PDF or pasted text (min 10 chars)." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        githubUrl: true, linkedinUrl: true, targetRoles: true,
        strongConcepts: true, gpa: true,
        projects: { select: { title: true, techStack: true } },
        certifications: { select: { name: true } }
      }
    });

    const isGemini = env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith("AIza");
    const useOllama = !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes("dummy");
    
    const profileData = {
      resume: resumeText,
      githubUrl: user?.githubUrl,
      linkedinUrl: user?.linkedinUrl,
      projects: user?.projects,
      certifications: user?.certifications,
      targetRoles: user?.targetRoles,
      gpa: user?.gpa,
    };

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

    const completion = await client.chat.completions.create({
      model: modelName,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are a career strategist specializing in Indian campus placements. Analyze the user profile and provide: 1) A score (0-100) for each category: DSA, Projects, Skills, Communication, Experience. 2) An estimated salary range for Indian tech companies (e.g. '₹8 - 14 LPA'). 3) Top 3-5 specific gaps to address as an array of strings. Return valid JSON only with keys shape: { profileScore: { projects: number, skills: number, dsa: number, communication: number, experience: number }, salaryRange: string, gaps: string[] }."
        },
        {
          role: "user",
          content: JSON.stringify(profileData),
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("AI returned an empty response.");
    }

    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse analyzer response:", raw);
      result = {
        profileScore: { projects: 0, skills: 0, dsa: 0, communication: 0, experience: 0 },
        salaryRange: "Could not analyze",
        gaps: ["AI model did not return a valid structured response.", "Consider checking if your model supports JSON."]
      };
    }

    await prisma.resume.upsert({
      where: { userId: auth.id },
      update: { analysisJson: result, salaryEst: result.salaryRange },
      create: {
        userId: auth.id,
        fileUrl: req.file ? "mock-cloudinary-url.pdf" : "inline://resume-text",
        analysisJson: result,
        salaryEst: result.salaryRange,
      },
    });

    return res.json(result);
  } catch (error) {
    console.error("Analyzer Error:", error);
    return res.status(500).json({ message: "Failed to analyze profile." });
  }
});

analyzerRouter.post("/deep-dive", requireAuth, async (req, res) => {
  const auth = (req as AuthedRequest).auth;
  if (!auth) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await spendCredits(tx, auth.id, 50, "Deep-dive AI analysis");
    });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Could not run deep dive." });
  }

  return res.json({
    summary: "Deep-dive generated",
    recommendations: ["Improve STAR bullets", "Add measurable outcomes", "Target role-aligned projects"],
  });
});

