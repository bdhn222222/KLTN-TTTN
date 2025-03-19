import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import requestLogger from "./middleware/logger.js";
import errorHandler from "./middleware/errorHandler.js";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Booking Doctor API" });
});

app.use("/auth", userRoutes);  
app.use(requestLogger);
app.use(errorHandler);
app.use((req, res) => {
  res.status(404).json({ message: "Route không tồn tại" });
});




const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
