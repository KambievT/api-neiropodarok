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
      clientName: row.clientName ?? undefined,
      contractorId: row.contractorId ?? undefined,
      description: row.description ?? undefined,
      serviceType: (row.serviceType as DayEntry["serviceType"]) ?? "individual",
      amount: row.amount,
      cost: row.cost ?? undefined,
      duration: row.duration ?? undefined,
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
        clientName: e.clientName ?? null,
        contractorId: e.contractorId ?? null,
        description: e.description ?? null,
        serviceType: e.serviceType ?? "individual",
        amount: e.amount,
        cost: e.cost ?? null,
        duration: e.duration ?? null,
        completed: e.completed ?? false,
      })),
    );

    if (data.length === 0) return;

    // Validate data before calling Prisma to avoid runtime validation errors
    const invalidItems: Array<{ index: number; item: any; reasons: string[] }> =
      [];
    const validData: typeof data = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const reasons: string[] = [];

      if (!item || typeof item !== "object") {
        reasons.push("not an object");
      } else {
        if (typeof item.id !== "string" || item.id.trim() === "")
          reasons.push("id must be non-empty string");
        if (typeof item.userId !== "string" || item.userId.trim() === "")
          reasons.push("userId must be non-empty string");
        if (typeof item.dayKey !== "string" || item.dayKey.trim() === "")
          reasons.push("dayKey must be non-empty string");
        // clientName is optional string
        if (
          item.clientName !== null &&
          item.clientName !== undefined &&
          typeof item.clientName !== "string"
        )
          reasons.push("clientName must be string or null");
        if (typeof item.amount !== "number" || !Number.isFinite(item.amount))
          reasons.push("amount must be number");
        if (
          item.cost !== null &&
          item.cost !== undefined &&
          typeof item.cost !== "number"
        )
          reasons.push("cost must be number or null");
        if (
          item.duration !== null &&
          item.duration !== undefined &&
          typeof item.duration !== "number"
        )
          reasons.push("duration must be number or null");
        if (typeof item.completed !== "boolean")
          reasons.push("completed must be boolean");
      }

      if (reasons.length > 0) {
        invalidItems.push({ index: i, item, reasons });
      } else {
        validData.push(item);
      }
    }

    if (invalidItems.length > 0) {
      console.warn(
        "setEntriesForUser: dropping invalid entries",
        JSON.stringify(invalidItems.slice(0, 10), null, 2),
      );
    }

    if (validData.length === 0) {
      return;
    }

    // Sanitize items to include only fields that exist in the Prisma model
    const sanitizedData = validData.map(
      ({
        id,
        userId,
        dayKey,
        clientName,
        contractorId,
        description,
        serviceType,
        amount,
        cost,
        duration,
        completed,
      }) => ({
        id,
        userId,
        dayKey,
        clientName,
        contractorId,
        description,
        serviceType,
        amount,
        cost,
        duration,
        completed,
      }),
    );

    try {
      await tx.entriesByDay.createMany({ data: sanitizedData });
    } catch (e) {
      console.error("setEntriesForUser: createMany failed", e, {
        sampleData: sanitizedData.slice(0, 5),
      });
      throw e;
    }
  });
}
