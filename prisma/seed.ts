// Creates the first admin account. Run with: npm run db:seed
// Existing accounts are never promoted or assigned a new password.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 16) {
    throw new Error("Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters.");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") throw new Error("Refusing to promote an existing non-admin account.");
    console.log("Admin already exists; credentials unchanged.");
    return;
  }
  await prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN" } });
  console.log("Admin account created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
