import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Booking Doctor API" });
});

app.use("/auth", userRoutes);

// Bắt lỗi cho các route không tồn tại
app.use((req, res, next) => {
  res.status(404).json({ message: "Route không tồn tại" });
});

// Bắt lỗi toàn bộ server
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Có lỗi xảy ra trên server", error: err.message });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
