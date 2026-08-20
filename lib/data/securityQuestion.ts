import "server-only";
import { prisma } from "./client";

export async function setSecurityQuestion(input: { userId: string; questionKey: string; answerHash: string }) {
  return prisma.securityQuestion.upsert({
    where: { userId: input.userId },
    create: input,
    update: { questionKey: input.questionKey, answerHash: input.answerHash },
  });
}

export async function findSecurityQuestionByUserId(userId: string) {
  return prisma.securityQuestion.findUnique({ where: { userId } });
}
