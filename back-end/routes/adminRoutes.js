import express from "express";
import {
  registerAdminController,
  loginAdminController,
} from "../controllers/adminController.js";
import validate from "../middleware/validate.js";
import { body } from "express-validator";
import rateLimiter from "../middleware/rateLimiter.js";

const router = express.Router();

router.post(
  "/register",
  validate([
    body("username")
      .notEmpty()
      .withMessage("Tên đăng nhập không được để trống"),
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").notEmpty().withMessage("Mật khẩu không được để trống"),
    body("password")
      .isLength({ min: 8, max: 32 })
      .withMessage("Mật khẩu phải có độ dài từ 8 đến 32 ký tự"),
  ]),
  registerAdminController
);
router.post(
  "/login",
  validate([
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").notEmpty().withMessage("Mật khẩu không được để trống"),
  ]),
  rateLimiter,
  loginAdminController
);
export default router;
