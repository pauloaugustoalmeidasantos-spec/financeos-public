/**
 * Mock do PrismaClient para testes isolados.
 * Cada método retorna jest.fn() para facilitar spying e assertions.
 */
export const mockPrisma = {
  userProfile: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  asset: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  goal: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  },
  goalContribution: {
    create: jest.fn(),
  },
  transaction: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
};

export type MockPrisma = typeof mockPrisma;
