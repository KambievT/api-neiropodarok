import { Router } from "express";
import jwt, { Secret } from "jsonwebtoken";
import { createUser, validateUser } from "../storage";
import { AuthRequestUser } from "../types";

const router = Router();

const JWT_SECRET: Secret = (process.env.JWT_SECRET as Secret) || "dev_secret";
// Make access tokens long-lived (100 days) as requested
const JWT_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "365d";

function signToken(user: AuthRequestUser): string {
  // Cast to any to avoid TypeScript overload issues with jsonwebtoken types
  return (jwt as any).sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      return res.status(400).json({ message: "Email и пароль обязательны" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Пароль должен быть от 6 символов" });
    }

    const user = await createUser(email, password);
    const payload: AuthRequestUser = { id: user.id, email: user.email };
    const token = signToken(payload);

    return res.status(201).json({ token, user: payload });
  } catch (e: any) {
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
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      return res.status(400).json({ message: "Email и пароль обязательны" });
    }

    const user = await validateUser(email, password);
    if (!user) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }

    const payload: AuthRequestUser = { id: user.id, email: user.email };
    const token = signToken(payload);

    return res.json({ token, user: payload });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Logout endpoint — client should remove stored token on logout.
// Because access tokens are long-lived here, to fully invalidate a token
// you would need server-side blacklisting; for a single-user app this
// endpoint signals the client to delete tokens and optionally revoke
// refresh tokens if you add that later.
router.post("/logout", async (_req, res) => {
  return res.json({ ok: true });
});

export default router;
