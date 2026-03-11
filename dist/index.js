"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const contractors_1 = __importDefault(require("./routes/contractors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Configure CORS to allow credentials. Provide a comma-separated list of
// allowed origins via `CORS_ORIGINS` env var (e.g. "https://app.example.com,http://localhost:8081").
// If `CORS_ORIGINS` is empty, reflect the request origin (not '*').
const rawOrigins = process.env.CORS_ORIGINS || "";
const allowedOrigins = rawOrigins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow non-browser requests (no origin)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.length === 0)
            return callback(null, origin);
        if (allowedOrigins.indexOf(origin) !== -1)
            return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    optionsSuccessStatus: 200,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "Calendar backend is running" });
});
app.use("/auth", auth_1.default);
app.use("/calendar", calendar_1.default);
app.use("/contractors", contractors_1.default);
app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
});
