import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const diverseCompanies = [
  // Tech Giants
  { name: "Google", sector: "Cloud & Search", package: "28 LPA" },
  { name: "Microsoft", sector: "Cloud & Enterprise", package: "26 LPA" },
  { name: "Amazon", sector: "E-commerce & Cloud", package: "25 LPA" },
  { name: "Apple", sector: "Hardware & OS", package: "27 LPA" },
  { name: "Meta", sector: "Social Media", package: "24 LPA" },
  { name: "Netflix", sector: "Streaming", package: "26 LPA" },
  { name: "Tesla", sector: "Electric Vehicles", package: "23 LPA" },
  { name: "Nvidia", sector: "AI & GPUs", package: "25 LPA" },
  { name: "OpenAI", sector: "AI Research", package: "28 LPA" },
  { name: "Anthropic", sector: "AI Safety", package: "27 LPA" },

  // Enterprise & B2B
  { name: "Salesforce", sector: "CRM & Cloud", package: "24 LPA" },
  { name: "Oracle", sector: "Database", package: "22 LPA" },
  { name: "SAP", sector: "ERP", package: "21 LPA" },
  { name: "IBM", sector: "Enterprise", package: "20 LPA" },
  { name: "Accenture", sector: "Consulting", package: "19 LPA" },
  { name: "Infosys", sector: "IT Services", package: "18 LPA" },
  { name: "TCS", sector: "IT Services", package: "17 LPA" },
  { name: "Wipro", sector: "IT Services", package: "16 LPA" },
  { name: "Cognizant", sector: "IT Services", package: "17 LPA" },
  { name: "HCL", sector: "IT Services", package: "16 LPA" },

  // Financial Tech
  { name: "Goldman Sachs", sector: "Banking", package: "30 LPA" },
  { name: "JPMorgan", sector: "Banking", package: "29 LPA" },
  { name: "Morgan Stanley", sector: "Banking", package: "28 LPA" },
  { name: "Stripe", sector: "FinTech", package: "26 LPA" },
  { name: "Square", sector: "FinTech", package: "24 LPA" },
  { name: "Robinhood", sector: "FinTech", package: "23 LPA" },
  { name: "Revolut", sector: "FinTech", package: "22 LPA" },
  { name: "Wise", sector: "FinTech", package: "21 LPA" },
  { name: "Coinbase", sector: "Crypto", package: "25 LPA" },
  { name: "Kraken", sector: "Crypto", package: "23 LPA" },

  // Developer Tools
  { name: "GitHub", sector: "DevOps", package: "25 LPA" },
  { name: "GitLab", sector: "DevOps", package: "24 LPA" },
  { name: "Atlassian", sector: "DevOps", package: "23 LPA" },
  { name: "JetBrains", sector: "IDEs", package: "22 LPA" },
  { name: "HashiCorp", sector: "Infrastructure", package: "24 LPA" },
  { name: "Figma", sector: "Design Tools", package: "26 LPA" },
  { name: "Canva", sector: "Design Tools", package: "25 LPA" },
  { name: "Notion", sector: "Productivity", package: "24 LPA" },
  { name: "Slack", sector: "Communication", package: "23 LPA" },
  { name: "Discord", sector: "Communication", package: "24 LPA" },

  // Infrastructure & Cloud
  { name: "Cloudflare", sector: "CDN", package: "25 LPA" },
  { name: "DigitalOcean", sector: "Cloud", package: "22 LPA" },
  { name: "Linode", sector: "Cloud", package: "21 LPA" },
  { name: "Fastly", sector: "CDN", package: "24 LPA" },
  { name: "Datadog", sector: "Monitoring", package: "26 LPA" },
  { name: "New Relic", sector: "Monitoring", package: "24 LPA" },
  { name: "Elastic", sector: "Search", package: "25 LPA" },
  { name: "MongoDB", sector: "Database", package: "26 LPA" },
  { name: "Redis", sector: "Cache", package: "25 LPA" },
  { name: "Postgres", sector: "Database", package: "23 LPA" },

  // E-commerce & Marketplaces
  { name: "Shopify", sector: "E-commerce", package: "24 LPA" },
  { name: "Etsy", sector: "Marketplace", package: "23 LPA" },
  { name: "eBay", sector: "Marketplace", package: "22 LPA" },
  { name: "AirBnB", sector: "Marketplace", package: "25 LPA" },
  { name: "Uber", sector: "Rideshare", package: "26 LPA" },
  { name: "Lyft", sector: "Rideshare", package: "24 LPA" },
  { name: "DoorDash", sector: "Food Delivery", package: "25 LPA" },
  { name: "Instacart", sector: "Grocery", package: "24 LPA" },
  { name: "Flipkart", sector: "E-commerce", package: "20 LPA" },
  { name: "Myntra", sector: "Fashion", package: "19 LPA" },

  // Media & Entertainment
  { name: "Disney", sector: "Entertainment", package: "23 LPA" },
  { name: "Warner Bros", sector: "Entertainment", package: "22 LPA" },
  { name: "Paramount", sector: "Entertainment", package: "21 LPA" },
  { name: "NBCUniversal", sector: "Entertainment", package: "21 LPA" },
  { name: "Spotify", sector: "Music", package: "24 LPA" },
  { name: "Twitch", sector: "Streaming", package: "25 LPA" },
  { name: "YouTube", sector: "Video", package: "26 LPA" },
  { name: "TikTok", sector: "Social", package: "25 LPA" },
  { name: "Reddit", sector: "Social", package: "23 LPA" },
  { name: "Snapchat", sector: "Social", package: "24 LPA" },

  // Healthcare & Biotech
  { name: "Teladoc", sector: "HealthTech", package: "20 LPA" },
  { name: "Genmab", sector: "Biotech", package: "22 LPA" },
  { name: "Moderna", sector: "Biotech", package: "23 LPA" },
  { name: "Pfizer", sector: "Pharma", package: "19 LPA" },
  { name: "Merck", sector: "Pharma", package: "18 LPA" },
  { name: "J&J", sector: "Healthcare", package: "19 LPA" },
  { name: "CVS Health", sector: "Healthcare", package: "17 LPA" },
  { name: "Walgreens", sector: "Healthcare", package: "16 LPA" },
  { name: "OptumHealth", sector: "HealthCare", package: "18 LPA" },
  { name: "UnitedHealth", sector: "Insurance", package: "19 LPA" },

  // Automotive
  { name: "BMW", sector: "Automotive", package: "21 LPA" },
  { name: "Mercedes", sector: "Automotive", package: "22 LPA" },
  { name: "Audi", sector: "Automotive", package: "20 LPA" },
  { name: "Toyota", sector: "Automotive", package: "19 LPA" },
  { name: "Honda", sector: "Automotive", package: "18 LPA" },
  { name: "Ford", sector: "Automotive", package: "17 LPA" },
  { name: "Rivian", sector: "EV", package: "24 LPA" },
  { name: "Lucid", sector: "EV", package: "23 LPA" },
  { name: "Fisker", sector: "EV", package: "21 LPA" },
  { name: "Nio", sector: "EV", package: "20 LPA" },

  // Misc Tech
  { name: "Adobe", sector: "Creative", package: "25 LPA" },
  { name: "Autodesk", sector: "Design", package: "24 LPA" },
  { name: "Unity", sector: "Gaming", package: "23 LPA" },
  { name: "Unreal", sector: "Gaming", package: "24 LPA" },
  { name: "Roblox", sector: "Gaming", package: "22 LPA" },
  { name: "Epic Games", sector: "Gaming", package: "25 LPA" },
  { name: "Niantic", sector: "Gaming", package: "23 LPA" },
];

const mcqQuestions = [
  {
    topic: "Data Structures",
    content: "Which data structure is best for implementing a LRU Cache?",
    options: ["Array", "HashMap + Linked List", "Binary Tree", "Queue"],
    correctAnswer: "HashMap + Linked List",
  },
  {
    topic: "Algorithms",
    content: "What is the time complexity of quicksort in the worst case?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
    correctAnswer: "O(n²)",
  },
  {
    topic: "System Design",
    content: "Which caching strategy evicts the least frequently used items?",
    options: ["LRU", "LFU", "FIFO", "MRU"],
    correctAnswer: "LFU",
  },
  {
    topic: "Database",
    content: "What does ACID stand for in database transactions?",
    options: [
      "Atomicity, Consistency, Isolation, Durability",
      "Availability, Consistency, Integration, Deployment",
      "Automated, Connected, Indexed, Distributed",
      "Asynchronous, Caching, Infrastructure, Data",
    ],
    correctAnswer: "Atomicity, Consistency, Isolation, Durability",
  },
  {
    topic: "Networking",
    content: "What layer of the OSI model does TCP operate on?",
    options: ["Layer 2", "Layer 3", "Layer 4", "Layer 7"],
    correctAnswer: "Layer 4",
  },
  {
    topic: "Security",
    content: "Which algorithm is NOT a public-key cryptography algorithm?",
    options: ["RSA", "ECC", "AES", "DSA"],
    correctAnswer: "AES",
  },
  {
    topic: "Web Development",
    content: "What does CORS stand for?",
    options: [
      "Cross-Origin Resource Sharing",
      "Cross-Object Remote Server",
      "Common Open Request System",
      "Centralized Operating Resource System",
    ],
    correctAnswer: "Cross-Origin Resource Sharing",
  },
  {
    topic: "DevOps",
    content: "Which container orchestration platform is created by Google?",
    options: ["Docker", "Kubernetes", "Nomad", "Swarm"],
    correctAnswer: "Kubernetes",
  },
];

const codingQuestions = [
  {
    topic: "Array",
    content: "Write a function to find two numbers that add up to a target sum.",
    testCases: [
      { input: [[2, 7, 11, 15], 9], output: [0, 1] },
      { input: [[3, 2, 4], 6], output: [1, 2] },
    ],
    expectedOutput: "Array indices as [i, j]",
  },
  {
    topic: "String",
    content: "Write a function to check if a string is a palindrome.",
    testCases: [
      { input: ["racecar"], output: true },
      { input: ["hello"], output: false },
    ],
    expectedOutput: "Boolean",
  },
  {
    topic: "Tree",
    content: "Write a function to find the maximum depth of a binary tree.",
    testCases: [
      { input: [{ val: 3, left: { val: 9 }, right: { val: 20 } }], output: 2 },
    ],
    expectedOutput: "Integer depth",
  },
  {
    topic: "Graph",
    content: "Write a function to detect if a cycle exists in an undirected graph.",
    testCases: [
      { input: [[0, 1], [1, 2], [2, 0]], output: true },
      { input: [[0, 1], [1, 2]], output: false },
    ],
    expectedOutput: "Boolean",
  },
  {
    topic: "Dynamic Programming",
    content: "Compute Fibonacci sequence up to n using dynamic programming.",
    testCases: [
      { input: [10], output: 55 },
      { input: [5], output: 5 },
    ],
    expectedOutput: "Integer fibonacci value",
  },
  {
    topic: "Sorting",
    content: "Implement merge sort and return the sorted array.",
    testCases: [
      { input: [[38, 27, 43, 3, 9]], output: [3, 9, 27, 38, 43] },
    ],
    expectedOutput: "Sorted array",
  },
  {
    topic: "Hash Table",
    content: "Find all anagrams of a word in a list.",
    testCases: [
      { input: [["listen", "silent", "hello"]], output: ["listen", "silent"] },
    ],
    expectedOutput: "Array of anagrams",
  },
  {
    topic: "Bit Manipulation",
    content: "Count the number of set bits (1s) in an integer.",
    testCases: [
      { input: [7], output: 3 },
      { input: [15], output: 4 },
    ],
    expectedOutput: "Integer count",
  },
];

const rounds = ["Technical Round 1", "Technical Round 2", "System Design", "HR Round", "Coding Assessment"];

async function main() {
  const demoPasswordHash = await bcrypt.hash("Demo12345!", 10);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@placementos.dev" },
    update: {
      name: "Demo Student",
      passwordHash: demoPasswordHash,
      branch: "CSE",
      gpa: 8.1,
      tier: "INTERMEDIATE",
      credits: 500,
      targetRoles: ["SWE", "Frontend Dev", "Backend Dev"],
      languages: ["JavaScript", "Python", "C++", "Java"],
      strongConcepts: ["DSA", "DBMS", "OS", "System Design"],
    },
    create: {
      email: "demo@placementos.dev",
      name: "Demo Student",
      passwordHash: demoPasswordHash,
      branch: "CSE",
      gpa: 8.1,
      tier: "INTERMEDIATE",
      credits: 500,
      targetRoles: ["SWE", "Frontend Dev", "Backend Dev"],
      languages: ["JavaScript", "Python", "C++", "Java"],
      strongConcepts: ["DSA", "DBMS", "OS", "System Design"],
    },
  });

  await prisma.creditTransaction.createMany({
    data: [
      { userId: demoUser.id, amount: 200, reason: "Registration welcome bonus" },
      { userId: demoUser.id, amount: 300, reason: "Demo credit top-up" },
    ],
    skipDuplicates: true,
  });

  console.log("Creating 100 diverse companies...");
  const createdCompanies = [];
  for (const company of diverseCompanies) {
    const existing = await prisma.company.findFirst({ where: { name: company.name } });
    if (existing) {
      createdCompanies.push(existing);
      continue;
    }
    const created = await prisma.company.create({
      data: {
        name: company.name,
        package: company.package,
        description: `${company.name} is a leading company in ${company.sector}. We're looking for talented engineers to join our team.`,
        minGpa: 7.0 + Math.random() * 1.5,
        eligibleBranches: ["CSE", "IT", "ECE", "EEE"],
        roles: ["SDE 1", "SDE 2", "Data Engineer", "DevOps Engineer", "ML Engineer"],
        requiredSkills: ["DSA", "System Design", "Database Design", "API Development"],
      },
    });
    createdCompanies.push(created);
  }

  console.log("Creating questions (MCQ and Coding) for all companies...");
  let questionCount = 0;

  for (let i = 0; i < createdCompanies.length; i++) {
    const company = createdCompanies[i];
    const round = rounds[i % rounds.length];

    // Add 1-2 MCQ questions per company
    for (let j = 0; j < 1 + (i % 2); j++) {
      const mcq = mcqQuestions[(i * 2 + j) % mcqQuestions.length];
      const isPremium = i % 4 === 0;

      const existing = await prisma.question.findFirst({
        where: {
          companyId: company.id,
          content: mcq.content,
        },
      });

      if (!existing) {
        const question = await prisma.question.create({
          data: {
            companyId: company.id,
            postedById: demoUser.id,
            content: mcq.content,
            type: "MCQ",
            options: mcq.options,
            correctAnswer: mcq.correctAnswer,
            round,
            year: 2023 + (i % 3),
            isPremium,
            creditsToUnlock: isPremium ? 30 : 0,
          },
        });

        if (isPremium) {
          await prisma.answer.create({
            data: {
              questionId: question.id,
              userId: demoUser.id,
              content: `The correct answer is: ${mcq.correctAnswer}. This tests knowledge of ${mcq.topic}.`,
              isPremium: true,
              creditsToUnlock: 0,
            },
          });
        }
        questionCount++;
      }
    }

    // Add 1 coding question per company
    const coding = codingQuestions[i % codingQuestions.length];
    const isPremiumCoding = i % 5 === 0;

    const existingCoding = await prisma.question.findFirst({
      where: {
        companyId: company.id,
        content: coding.content,
      },
    });

    if (!existingCoding) {
      const codingQuestion = await prisma.question.create({
        data: {
          companyId: company.id,
          postedById: demoUser.id,
          content: coding.content,
          type: "CODING",
          testCases: coding.testCases,
          expectedOutput: coding.expectedOutput,
          round: "Coding Round",
          year: 2023 + (i % 3),
          isPremium: isPremiumCoding,
          creditsToUnlock: isPremiumCoding ? 50 : 0,
        },
      });

      if (isPremiumCoding) {
        await prisma.answer.create({
          data: {
            questionId: codingQuestion.id,
            userId: demoUser.id,
            content: `Here's a solution approach for ${coding.topic}: The expected output is ${coding.expectedOutput}. Check the test cases for validation.`,
            isPremium: true,
            creditsToUnlock: 0,
          },
        });
      }
      questionCount++;
    }
  }

  console.log("Creating mentor accounts...");
  const mentorEmails = Array.from({ length: 10 }).map((_, idx) => `mentor${idx + 1}@placementos.dev`);
  for (let idx = 0; idx < mentorEmails.length; idx += 1) {
    const email = mentorEmails[idx];
    const hash = await bcrypt.hash(`MentorPass${idx + 1}!`, 10);
    await prisma.user.upsert({
      where: { email },
      update: {
        name: `Mentor ${idx + 1}`,
        passwordHash: hash,
        tier: "PLACEMENT_READY",
        branch: "CSE",
        gpa: 8.5 + Math.random() * 0.5,
        credits: 1000,
        targetRoles: ["SWE", "Tech Lead"],
        languages: ["JavaScript", "Python", "Java", "Go"],
        strongConcepts: ["DSA", "System Design", "Architecture"],
      },
      create: {
        email,
        name: `Mentor ${idx + 1}`,
        passwordHash: hash,
        tier: "PLACEMENT_READY",
        branch: "CSE",
        gpa: 8.5 + Math.random() * 0.5,
        credits: 1000,
        targetRoles: ["SWE", "Tech Lead"],
        languages: ["JavaScript", "Python", "Java", "Go"],
        strongConcepts: ["DSA", "System Design", "Architecture"],
      },
    });
  }

  console.log("✅ Seed complete:");
  console.log(`   - 100 diverse companies created`);
  console.log(`   - ${questionCount} questions (MCQ + Coding) created`);
  console.log(`   - Demo user & 10 mentors created`);
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

