import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";
import userRoutes from "./routes/userRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import pharmacistRoutes from "./routes/pharmacistRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import requestLogger from "./middleware/logger.js";
import errorHandler from "./middleware/errorHandler.js";
import momoRoutes from "./routes/momoRoutes.js";

dotenv.config();

const app = express();

app.use("/momo", momoRoutes);

// Middleware để log tất cả requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  next();
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Booking Doctor API" });
});

app.use("/user", userRoutes);
app.use("/doctor", doctorRoutes);
app.use("/admin", adminRoutes);
app.use("/pharmacist", pharmacistRoutes);
app.use("/patient", patientRoutes);

// Logger & error handler
app.use(requestLogger);
app.use(errorHandler);
app.use(requestLogger);
app.use(errorHandler);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
