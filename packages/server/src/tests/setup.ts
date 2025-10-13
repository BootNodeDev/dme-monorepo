import { PrismaClient } from "@prisma/client";

export let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL!,
  });
});

beforeEach(async () => {
  await truncateDb();
});

async function truncateDb() {
  await prisma.user.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.message.deleteMany();
}
