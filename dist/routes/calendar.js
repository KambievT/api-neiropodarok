"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const storage_1 = require("../storage");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get("/", async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Требуется авторизация" });
    const data = await (0, storage_1.getEntriesForUser)(req.user.id);
    return res.json(data);
});
router.post("/", async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Требуется авторизация" });
    const body = req.body;
    await (0, storage_1.setEntriesForUser)(req.user.id, body);
    return res.status(204).send();
});
router.post("/entry", async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Требуется авторизация" });
    const { dayKey, entry } = req.body;
    if (!dayKey || !entry) {
        return res.status(400).json({ message: "dayKey и entry обязательны" });
    }
    const current = await (0, storage_1.getEntriesForUser)(req.user.id);
    const list = current[dayKey] ?? [];
    const next = {
        ...current,
        [dayKey]: [...list, entry],
    };
    await (0, storage_1.setEntriesForUser)(req.user.id, next);
    return res.status(201).json(entry);
});
// PATCH /calendar/entry — редактирование заявки
router.patch("/entry", async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: "Требуется авторизация" });
    const { dayKey, entryId, update } = req.body;
    if (!dayKey || !entryId || !update) {
        return res
            .status(400)
            .json({ message: "dayKey, entryId и update обязательны" });
    }
    const current = await (0, storage_1.getEntriesForUser)(req.user.id);
    const list = current[dayKey] ?? [];
    const nextList = list.map((e) => e.id === entryId ? { ...e, ...update } : e);
    const next = { ...current, [dayKey]: nextList };
    await (0, storage_1.setEntriesForUser)(req.user.id, next);
    return res.status(200).json(nextList.find((e) => e.id === entryId));
});
exports.default = router;
