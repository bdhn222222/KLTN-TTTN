import express from "express";
import { registerAdminController, loginAdminController } from "../controllers/adminController.js";
import validate from "../middleware/validate.js";
import { body } from "express-validator";

const router = express.Router();

router.post(
  "/register",
  validate([
    body("username").notEmpty().withMessage("Tên đăng nhập không được để trống"),
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").isLength({ min: 8 }).withMessage("Mật khẩu phải có ít nhất 8 ký tự"),
  ]),
  registerAdminController
);
router.post(
  "/login",
  validate([
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").isEmpty().withMessage("Mật khẩu không được để trống"),
  ]),
  loginAdminController
);
export default router;