import "server-only";
import { prisma } from "./client";

export async function recordLoginHistory(input: {
  userId: string;
  success: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return prisma.loginHistory.create({
    data: {
      userId: input.userId,
      success: input.success,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function listLoginHistory(userId: string, limit = 20) {
  return prisma.loginHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
