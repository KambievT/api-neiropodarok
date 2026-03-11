import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRouter from "./routes/auth";
import calendarRouter from "./routes/calendar";
import contractorsRouter from "./routes/contractors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configure CORS to allow credentials. Provide a comma-separated list of
// allowed origins via `CORS_ORIGINS` env var (e.g. "https://app.example.com,http://localhost:8081").
// If `CORS_ORIGINS` is empty, reflect the request origin (not '*').
const rawOrigins = process.env.CORS_ORIGINS || "";
const allowedOrigins = rawOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, origin);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Calendar backend is running" });
});

app.use("/auth", authRouter);
app.use("/calendar", calendarRouter);
app.use("/contractors", contractorsRouter);

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
