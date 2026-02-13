import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient;
}

// Reusar instância do Prisma em dev (evita leak de conexões no hot-reload)
if (!global.prisma) {
  global.prisma = new PrismaClient();
}

const prisma = global.prisma;
export default prisma;
