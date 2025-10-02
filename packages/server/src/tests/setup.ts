import { PrismaClient } from "@prisma/client";

export let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL!,
  });

  await prisma.$queryRaw`PRAGMA journal_mode=MEMORY;`;
  await prisma.$queryRaw`PRAGMA synchronous=OFF;`;
  await prisma.$queryRaw`PRAGMA cache_size=10000;`;
});

beforeEach(async () => {
  await truncateDb();
});

async function truncateDb() {
  const tablenames = await prisma.$queryRaw<
    { name: string }[]
  >`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'`;

  await Promise.all(
    tablenames.map(({ name }) => prisma.$executeRawUnsafe(`DELETE FROM "${name}"`)),
  );
}
