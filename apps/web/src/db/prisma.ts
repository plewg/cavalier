import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "#src/env";

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const globalForPrisma = global as unknown as {
    prisma: PrismaClient | undefined;
};

const adapterConfig = { connectionString: env.DATABASE_URL };
const adapter =
    env.NODE_ENV === "development"
        ? new PrismaPg(adapterConfig)
        : new PrismaNeon(adapterConfig);

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            env.NODE_ENV === "development"
                ? ["query", "error", "warn"]
                : ["error"],
        adapter,
    });

// NOTE: https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
if (env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
