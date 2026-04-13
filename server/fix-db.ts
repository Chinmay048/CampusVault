import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  await prisma.$executeRawUnsafe(`DELETE FROM "Question" WHERE "postedById" IS NULL`);
  console.log("Done");
  await prisma.$disconnect();
}
run().catch(console.error);