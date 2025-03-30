import express from "express";
import {
  registerPatientController,
  loginPatientController,
} from "../controllers/patientController.js";
import validate from "../middleware/validate.js";
import { body } from "express-validator";
const router = express.Router();
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter.js";
router.post(
  "/register",
  validate([
    body("username")
      .notEmpty()
      .withMessage("Tên đăng nhập không được để trống"),
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Mật khẩu phải có ít nhất 8 ký tự"),
    body("date_of_birth")
      .notEmpty()
      .withMessage("Ngày sinh không được để trống"),
    body("gender")
      .isIn(["male", "female", "other"])
      .withMessage("Giới tính không hợp lệ"),
  ]),
  registerLimiter,
  registerPatientController
);

router.post(
  "/login",
  validate([
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").notEmpty().withMessage("Mật khẩu không được để trống"),
  ]),
  loginLimiter,
  loginPatientController
);

export default router;

// import upload from "../middleware/uploadHandler.js";

// // Upload 1 ảnh đại diện
// router.post("/upload-avatar", upload.single("avatar"), (req, res) => {
//   return res.json({
//     message: "Upload thành công",
//     imageUrl: req.file.path, // Đây là URL trên Cloudinary
//   });
// });
