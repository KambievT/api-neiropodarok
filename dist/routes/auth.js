"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const storage_1 = require("../storage");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10);
function signAccessToken(user) {
    return jsonwebtoken_1.default.sign(user, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
}
function generateRefreshToken() {
    return crypto_1.default.randomBytes(48).toString("hex");
}
router.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email и пароль обязательны" });
        }
        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Пароль должен быть от 6 символов !!!" });
        }
        const user = await (0, storage_1.createUser)(email, password);
        const payload = { id: user.id, email: user.email };
        const accessToken = signAccessToken(payload);
        const refreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
        await (0, storage_1.createRefreshToken)(user.id, refreshToken, expiresAt);
        // Set refresh token as HttpOnly cookie for browsers. Cross-site cookies
        // require `SameSite=None` and `secure` in production.
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            expires: expiresAt,
        });
        return res.status(201).json({ accessToken, refreshToken, user: payload });
    }
    catch (e) {
        if (e?.message === "USER_ALREADY_EXISTS") {
            return res
                .status(409)
                .json({ message: "Пользователь с таким email уже существует" });
        }
        console.error(e);
        return res.status(500).json({ message: "Ошибка сервера" });
    }
});
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email и пароль обязательны" });
        }
        const user = await (0, storage_1.validateUser)(email, password);
        if (!user) {
            return res.status(401).json({ message: "Неверный email или пароль" });
        }
        const payload = { id: user.id, email: user.email };
        const accessToken = signAccessToken(payload);
        const refreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
        await (0, storage_1.createRefreshToken)(user.id, refreshToken, expiresAt);
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            expires: expiresAt,
        });
        return res.json({ accessToken, refreshToken, user: payload });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Ошибка сервера" });
    }
});
// Logout endpoint — client should remove stored token on logout.
// Because access tokens are long-lived here, to fully invalidate a token
// you would need server-side blacklisting; for a single-user app this
// endpoint signals the client to delete tokens and optionally revoke
// refresh tokens if you add that later.
router.post("/logout", async (req, res) => {
    // Accept refreshToken from body or cookie
    const bodyToken = req.body?.refreshToken;
    const cookieToken = req.cookies?.refreshToken;
    const tokenToRevoke = bodyToken || cookieToken;
    if (tokenToRevoke) {
        try {
            await (0, storage_1.revokeRefreshToken)(tokenToRevoke);
        }
        catch (e) {
            console.warn("logout: revoke failed", e);
        }
    }
    // Clear cookie
    res.clearCookie("refreshToken", {
        sameSite: "none",
        secure: process.env.NODE_ENV === "production",
    });
    return res.json({ ok: true });
});
router.post("/refresh", async (req, res) => {
    try {
        // Accept refresh token from body or cookie
        const bodyToken = req.body?.refreshToken;
        const cookieToken = req.cookies?.refreshToken;
        const refreshToken = bodyToken || cookieToken;
        if (!refreshToken)
            return res.status(400).json({ message: "refreshToken обязателен" });
        const row = await (0, storage_1.findRefreshToken)(refreshToken);
        if (!row || row.revoked)
            return res.status(401).json({ message: "Неверный refresh token" });
        if (new Date(row.expiresAt) < new Date())
            return res.status(401).json({ message: "Refresh token просрочен" });
        // Issue new access token and rotate refresh token
        const user = { id: row.userId };
        const accessToken = signAccessToken(user);
        // rotate: revoke old, create new
        await (0, storage_1.revokeRefreshToken)(refreshToken);
        const newRefresh = generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
        await (0, storage_1.createRefreshToken)(row.userId, newRefresh, expiresAt);
        // Set rotated refresh token as cookie
        res.cookie("refreshToken", newRefresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            expires: expiresAt,
        });
        return res.json({ accessToken, refreshToken: newRefresh });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Ошибка сервера" });
    }
});
exports.default = router;
