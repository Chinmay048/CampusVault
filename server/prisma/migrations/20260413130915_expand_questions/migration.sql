-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AnswerUnlock" ADD CONSTRAINT "AnswerUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
