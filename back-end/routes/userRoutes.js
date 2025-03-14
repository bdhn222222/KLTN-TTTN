import express from "express";
import { registerUser } from "../controllers/userController.js";
import { body } from "express-validator";

const router = express.Router();

// Route đăng ký người dùng
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Tên không được để trống"),
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").isLength({ min: 8 }).withMessage("Mật khẩu phải ít nhất 8 ký tự"),
    body("role").isIn(["patient", "doctor", "pharmacist", "admin"]).withMessage("Vai trò không hợp lệ"),
  ],
  registerUser
);

export default router;
