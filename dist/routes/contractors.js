"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get("/", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Требуется авторизация" });
    }
    const rows = await prisma_1.prisma.contractor.findMany({
        where: { userId: req.user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
    });
    return res.json(rows);
});
router.post("/", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Требуется авторизация" });
    }
    const { name } = req.body;
    const trimmed = (name ?? "").trim();
    if (!trimmed) {
        return res.status(400).json({ message: "name обязателен" });
    }
    try {
        const created = await prisma_1.prisma.contractor.create({
            data: {
                userId: req.user.id,
                name: trimmed,
            },
            select: { id: true, name: true },
        });
        return res.status(201).json(created);
    }
    catch (e) {
        // уникальность @@unique([userId, name])
        if (e?.code === "P2002") {
            return res.status(409).json({ message: "Подрядчик уже существует" });
        }
        console.error(e);
        return res.status(500).json({ message: "Ошибка сервера" });
    }
});
router.delete("/:id", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Требуется авторизация" });
    }
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "id обязателен" });
    }
    // удаляем только подрядчика пользователя
    const existing = await prisma_1.prisma.contractor.findFirst({
        where: { id, userId: req.user.id },
        select: { id: true },
    });
    if (!existing) {
        return res.status(404).json({ message: "Не найдено" });
    }
    await prisma_1.prisma.contractor.delete({ where: { id } });
    return res.status(204).send();
});
exports.default = router;
