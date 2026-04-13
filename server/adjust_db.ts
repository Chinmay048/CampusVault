import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    let packageStr = c.package;
    let minGpa = c.minGpa;
    
    if (i % 4 === 0) {
      packageStr = `${Math.floor(Math.random() * 4) + 3} LPA`;
    } else if (i % 4 === 1) {
      packageStr = `${Math.floor(Math.random() * 4) + 6} LPA`;
    } else if (i % 4 === 2) {
      packageStr = `${Math.floor(Math.random() * 5) + 10} LPA`;
    }
    
    if (i % 5 === 0) {
      minGpa = 5.0 + Math.random() * 1.5;
    }
    
    await prisma.company.update({
      where: { id: c.id },
      data: { package: packageStr, minGpa }
    });
  }
  console.log('DB Adjusted');
}

main().finally(() => prisma.$disconnect());