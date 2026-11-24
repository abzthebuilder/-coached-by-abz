import type { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "./prisma";

// Created on first use, so `next build` never needs a database connection.
const g = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
  if (!g.prisma) g.prisma = createPrismaClient();
  return g.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const c = client();
    const v = Reflect.get(c, prop, c);
    return typeof v === "function" ? v.bind(c) : v;
  },
});
