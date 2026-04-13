import * as fs from 'fs';

let content = fs.readFileSync('src/routes/questions.ts', 'utf-8');

const verifyEndpoint = `

questionsRouter.post("/:id/verify-answer", requireAuth, async (req, res) => {
  const qId = req.params.id;
  const { answer } = req.body;
  const auth = (req as any).auth;
  if (!auth) return res.status(401).json({ message: "Unauthorized" });

  const question = await prisma.question.findUnique({ where: { id: qId } });
  if (!question) return res.status(404).json({ message: "Question not found" });

  try {
    const isGemini = env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith("AIza");
    let client;
    let modelName = "mistral";

    if (env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes("dummy")) {
      client = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
        ...(isGemini && { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" })
      });
      modelName = isGemini ? "gemini-2.5-flash" : "gpt-4o-mini";
    } else {
      client = new OpenAI({ 
        apiKey: "ollama",
        baseURL: "http://localhost:11434/v1"
      });
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
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: 'You are an interviewer verifying an answer. Given the question details and user answer, evaluate correctness. Return JSON: { "isCorrect": boolean, "explanation": "reasoning" }'
        },
        {
          role: "user",
          content: JSON.stringify(promptParams)
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content;
    let result = { isCorrect: false, explanation: "Failed to parse." };
    if (raw) {
        result = JSON.parse(raw.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
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
`;

if (!content.includes('verify-answer')) {
  if (!content.includes('OpenAI')) {
    content = 'import OpenAI from "openai";\n' + content;
  }
  if (!content.includes('addCredits')) {
    content = content.replace("spendCredits", "spendCredits, addCredits");
  }
  if (!content.includes('env.js')) {
    content = 'import { env } from "../config/env.js";\n' + content;
  }
  
  content = content + verifyEndpoint;
  fs.writeFileSync('src/routes/questions.ts', content);
  console.log('Appended verify endpoint');
} else {
  console.log('Already appended');
}
