"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const storage_1 = require("../storage");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = '7d';
function signToken(user) {
    return jsonwebtoken_1.default.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email и пароль обязательны' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Пароль должен быть от 6 символов' });
        }
        const user = await (0, storage_1.createUser)(email, password);
        const payload = { id: user.id, email: user.email };
        const token = signToken(payload);
        return res.status(201).json({ token, user: payload });
    }
    catch (e) {
        if (e?.message === 'USER_ALREADY_EXISTS') {
            return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
        }
        console.error(e);
        return res.status(500).json({ message: 'Ошибка сервера' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email и пароль обязательны' });
        }
        const user = await (0, storage_1.validateUser)(email, password);
        if (!user) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }
        const payload = { id: user.id, email: user.email };
        const token = signToken(payload);
        return res.json({ token, user: payload });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Ошибка сервера' });
    }
});
exports.default = router;
