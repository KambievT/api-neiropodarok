"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const contractors_1 = __importDefault(require("./routes/contractors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
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
