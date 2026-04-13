# CampusVault 3.0 / PlacementOS

CampusVault 3.0 is a full-stack campus placement platform featuring AI-powered Resume Analysis, automated Interview Question Generation, and Answer Verification. 

## Workspace

- `client/` — React + TypeScript + Vite frontend
- `server/` — Node.js Express + TypeScript backend
- `server/prisma/` — PostgreSQL Database schema and migrations
- `docker-compose.yml` — Local PostgreSQL & Redis infrastructure

## Key Features
- **Local AI Fallback**: Integrates natively with [Ollama](https://ollama.com) (e.g. `llama3` or `qwen3.5`) to verify answers and analyze resumes locally without relying on expensive remote OpenAI APIs.
- **PDF Resume Parser**: Automatically extracts and reads PDF resumes offline using `pdf-parse`.
- **JWT Authentication**: Secure Bearer tokens used for protected API routes and stored securely on the frontend.
- **Credit System**: Users can spend credits to unlock premium question bundles or run deep-dive analyses.

## Quick Start

1. **Environment Setup**  
   Copy `.env.example` to `.env` in the repository root and fill the secrets. Use `OPENAI_API_KEY=dummy` if you want the system to forcefully prioritize your local Ollama connection!
   - Default DB Name: `CampusVault`
   - Default DB User: `postgres`
   - Default DB Password: `admin`

2. **Start Infrastructure**  
   Start your Dockerized database:
   ```bash
   docker compose up -d
   ```

3. **Install Dependencies**  
   Install packages for both the client and server:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

4. **Initialize Database**  
   Execute queries inside the `server/` folder:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Run the Application**  
   - Start the backend server (`cd server && npm run dev`)
   - Start the frontend vite app (`cd client && npm run dev`)
   - Ensure Ollama is running in the background for AI capabilities (`ollama run llama3`)

## Demo Credentials

- Email: `demo@placementos.dev`
- Password: `Demo12345!`

