import { PrismaClient } from "@prisma/client";

// 개발 중 HMR로 커넥션이 늘어나지 않도록 globalThis에 단일 인스턴스를 보관한다.
const g = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma =
  g.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  g.__prisma = prisma;
}
