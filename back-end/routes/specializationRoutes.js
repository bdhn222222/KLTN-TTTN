import express from "express";
import { createSpecializationController } from "../controllers/specializationController.js";

const router = express.Router();

// API tạo chuyên khoa mới
router.post("/add", createSpecializationController);

export default router;
