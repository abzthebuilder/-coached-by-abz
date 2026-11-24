import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads the connection string from here rather than from schema.prisma.
// On Railway, DATABASE_URL comes from the service variables.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
