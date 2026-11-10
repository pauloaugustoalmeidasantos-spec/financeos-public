import { PrismaClient, TransactionType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding base default categories...");

  const defaultCategories = [
    // Expenses
    { name: "Alimentação", type: TransactionType.EXPENSE, isDefault: true, isActive: true },
    { name: "Transporte", type: TransactionType.EXPENSE, isDefault: true, isActive: true },
    { name: "Moradia", type: TransactionType.EXPENSE, isDefault: true, isActive: true },
    { name: "Saúde", type: TransactionType.EXPENSE, isDefault: true, isActive: true },
    { name: "Lazer", type: TransactionType.EXPENSE, isDefault: true, isActive: true },
    { name: "Educação", type: TransactionType.EXPENSE, isDefault: true, isActive: true },
    { name: "Vestuário", type: TransactionType.EXPENSE, isDefault: true, isActive: true },
    { name: "Outros", type: TransactionType.EXPENSE, isDefault: true, isActive: true },
    // Incomes
    { name: "Salário", type: TransactionType.INCOME, isDefault: true, isActive: true },
    { name: "Freelance", type: TransactionType.INCOME, isDefault: true, isActive: true },
    { name: "Investimentos", type: TransactionType.INCOME, isDefault: true, isActive: true },
    { name: "Outros", type: TransactionType.INCOME, isDefault: true, isActive: true },
  ];

  for (const cat of defaultCategories) {
    // Upsert avoids duplicating if seed is run multiple times
    await prisma.category.upsert({
      where: {
        userId_name_type: {
          userId: null as any, // Using global context since user is not enforced for global categories
          name: cat.name,
          type: cat.type,
        },
      } as any, // fallback for schema if unique doesn't allow explicit null object
      update: {},
      create: {
        name: cat.name,
        type: cat.type,
        isDefault: cat.isDefault,
        isActive: cat.isActive,
      },
      // Since unique constraint is @@unique([userId, name, type]), and userId is nullable
    });
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
