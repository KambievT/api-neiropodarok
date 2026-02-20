import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRouter from "./routes/auth";
import calendarRouter from "./routes/calendar";
import contractorsRouter from "./routes/contractors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
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
