import "server-only";
import { prisma } from "./client";
import type { AccountStatus, Role } from "@prisma/client";

export async function createUser(input: { email: string; passwordHash: string }) {
  return prisma.user.create({
    data: { email: input.email, passwordHash: input.passwordHash },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function updatePassword(userId: string, passwordHash: string) {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function deleteUser(userId: string) {
  return prisma.user.delete({ where: { id: userId } });
}

export async function listUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
}

export async function setUserStatus(userId: string, status: AccountStatus) {
  return prisma.user.update({ where: { id: userId }, data: { status } });
}

export async function setUserRole(userId: string, role: Role) {
  return prisma.user.update({ where: { id: userId }, data: { role } });
}
