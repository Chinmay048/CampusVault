import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config();

import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({ name: "PlacementOS API", status: "running" });
});

app.use("/api", apiRouter);

