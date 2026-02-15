import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient;
}

// Reusar instância do Prisma em dev (evita leak de conexões no hot-reload)
// Em serverless (Vercel), log queries lentas para diagnóstico
if (!global.prisma) {
  global.prisma = new PrismaClient({
    log: process.env.NODE_ENV === "production"
      ? [{ emit: "stdout", level: "error" }]
      : ["query", "error", "warn"],
    datasourceUrl: process.env.DATABASE_URL,
  });

  // Pre-warm: tenta conectar ao banco no momento do import
  // Em serverless, isso reduz latência na primeira query
  global.prisma.$connect().catch((err) => {
    console.error("[db.server] Failed to pre-connect:", err.message);
  });
}

const prisma = global.prisma;
export default prisma;
