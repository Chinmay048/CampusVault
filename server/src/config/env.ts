import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GITHUB_TOKEN: z.string().min(1).optional(),
  CLOUDINARY_URL: z.string().min(1).optional(),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434/v1"),
  OLLAMA_MODEL: z.string().default("llama3"),
  COMPANY_BUNDLE_COST: z.coerce.number().int().positive().default(10),
});

export const env = envSchema.parse(process.env);

