-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "credits" SET DEFAULT 100;

-- CreateTable
CREATE TABLE "public"."CompanyUnlock" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyUnlock_companyId_userId_key" ON "public"."CompanyUnlock"("companyId", "userId");

-- AddForeignKey
ALTER TABLE "public"."CompanyUnlock" ADD CONSTRAINT "CompanyUnlock_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyUnlock" ADD CONSTRAINT "CompanyUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
