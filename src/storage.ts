import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { DayEntry, EntriesByDay, User } from "./types"; // Import the Prisma namespace from the generated client so we have
// the correct TransactionClient type and other model types available.
import type { Prisma } from "./generated/prisma/client";
export async function createUser(
  email: string,
  password: string,
): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
    },
  });

  return {
    id: created.id,
    email: created.email,
    passwordHash: created.passwordHash,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
  };
}

export async function validateUser(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;
  return user;
}

export async function getEntriesForUser(userId: string): Promise<EntriesByDay> {
  const rows = await prisma.entriesByDay.findMany({
    where: { userId },
  });

  const result: EntriesByDay = {};

  for (const row of rows) {
    const entry: DayEntry = {
      id: row.id,
      clientName: row.clientName,
      amount: row.amount,
      cost: row.cost ?? undefined,
      completed: row.completed ?? undefined,
    };
    if (!result[row.dayKey]) {
      result[row.dayKey] = [];
    }
    result[row.dayKey].push(entry);
  }

  return result;
}

export async function setEntriesForUser(
  userId: string,
  nextEntries: EntriesByDay,
): Promise<void> {
  // Транзакция: очищаем старые записи пользователя и записываем новые
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.entriesByDay.deleteMany({ where: { userId } });

    const data = Object.entries(nextEntries).flatMap(([dayKey, entries]) =>
      entries.map((e) => ({
        id: e.id,
        userId,
        dayKey,
        clientName: e.clientName,
        amount: e.amount,
        cost: e.cost ?? null,
        completed: e.completed ?? false,
      })),
    );

    if (data.length > 0) {
      await tx.entriesByDay.createMany({ data });
    }
  });
}
