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
            clientName: "",
            contractorId: e.contractorId ?? null,
            description: e.description ?? null,
            serviceType: e.serviceType ?? "individual",
            amount: e.amount,
            cost: e.cost ?? null,
            duration: e.duration ?? null,
            completed: e.completed ?? false,
        })));
        if (data.length === 0)
            return;
        // Validate data before calling Prisma to avoid runtime validation errors
        const invalidItems = [];
        const validData = [];
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const reasons = [];
            if (!item || typeof item !== 'object') {
                reasons.push('not an object');
            }
            else {
                if (typeof item.id !== 'string' || item.id.trim() === '')
                    reasons.push('id must be non-empty string');
                if (typeof item.userId !== 'string' || item.userId.trim() === '')
                    reasons.push('userId must be non-empty string');
                if (typeof item.dayKey !== 'string' || item.dayKey.trim() === '')
                    reasons.push('dayKey must be non-empty string');
                if (typeof item.clientName !== 'string')
                    reasons.push('clientName must be string');
                if (typeof item.amount !== 'number' || !Number.isFinite(item.amount))
                    reasons.push('amount must be number');
                if (item.cost !== null && item.cost !== undefined && typeof item.cost !== 'number')
                    reasons.push('cost must be number or null');
                if (item.duration !== null && item.duration !== undefined && typeof item.duration !== 'number')
                    reasons.push('duration must be number or null');
                if (typeof item.completed !== 'boolean')
                    reasons.push('completed must be boolean');
            }
            if (reasons.length > 0) {
                invalidItems.push({ index: i, item, reasons });
            }
            else {
                validData.push(item);
            }
        }
        if (invalidItems.length > 0) {
            // Log details for debugging and throw controlled error so caller can handle
            console.warn('setEntriesForUser: invalid entries detected', JSON.stringify(invalidItems.slice(0, 10), null, 2));
            throw new Error(`INVALID_ENTRIES: ${invalidItems.length} invalid entries`);
        }
        try {
            await tx.entriesByDay.createMany({ data: validData });
        }
        catch (e) {
            console.error('setEntriesForUser: createMany failed', e);
            throw e;
        }
    });
}
