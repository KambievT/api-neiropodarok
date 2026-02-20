"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.findUserByEmail = findUserByEmail;
exports.validateUser = validateUser;
exports.getEntriesForUser = getEntriesForUser;
exports.setEntriesForUser = setEntriesForUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("./prisma");
async function createUser(email, password) {
    const existing = await prisma_1.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });
    if (existing) {
        throw new Error("USER_ALREADY_EXISTS");
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const created = await prisma_1.prisma.user.create({
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
async function findUserByEmail(email) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });
    if (!user)
        return null;
    return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
    };
}
async function validateUser(email, password) {
    const user = await findUserByEmail(email);
    if (!user)
        return null;
    const match = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!match)
        return null;
    return user;
}
async function getEntriesForUser(userId) {
    const rows = await prisma_1.prisma.entriesByDay.findMany({
        where: { userId },
    });
    const result = {};
    for (const row of rows) {
        const entry = {
            id: row.id,
            clientName: row.clientName,
            contractorId: row.contractorId ?? undefined,
            description: row.description ?? undefined,
            serviceType: row.serviceType ?? "individual",
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
async function setEntriesForUser(userId, nextEntries) {
    // Транзакция: очищаем старые записи пользователя и записываем новые
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.entriesByDay.deleteMany({ where: { userId } });
        const data = Object.entries(nextEntries).flatMap(([dayKey, entries]) => entries.map((e) => ({
            id: e.id,
            userId,
            dayKey,
            clientName: e.clientName,
            contractorId: e.contractorId ?? null,
            description: e.description ?? null,
            serviceType: e.serviceType ?? "individual",
            amount: e.amount,
            cost: e.cost ?? null,
            duration: e.duration ?? null,
            completed: e.completed ?? false,
        })));
        if (data.length > 0) {
            await tx.entriesByDay.createMany({ data });
        }
    });
}
