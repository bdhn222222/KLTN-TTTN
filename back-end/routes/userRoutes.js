import express from "express";
import { registerUser, loginUser, getCurrentUser, updateUserProfile, changePassword, forgotPassword } from "../controllers/userController.js";
import { authenticateUser } from "../middleware/auth.js";
import { body } from "express-validator";

const router = express.Router();

// Route đăng ký
router.post("/register", registerUser);

// Route đăng nhập
router.post("/login", loginUser); 

router.get("/me", authenticateUser, getCurrentUser);
// Route cập nhật thông tin cá nhân
router.put(
    "/update",
    authenticateUser, 
    [
      body("name").optional().isLength({ min: 3 }).withMessage("Tên phải có ít nhất 3 ký tự"),
      body("email").optional().isEmail().withMessage("Email không hợp lệ"),
      body("password").optional().isLength({ min: 8 }).withMessage("Mật khẩu phải có ít nhất 8 ký tự"),
      body("avatar").optional().isURL().withMessage("Avatar phải là URL hợp lệ")
    ],
    updateUserProfile
  );
  router.put(
    "/change-password",
    authenticateUser, 
    [
      body("oldPassword").notEmpty().withMessage("Mật khẩu cũ không được để trống"),
      body("newPassword").isLength({ min: 8 }).withMessage("Mật khẩu mới phải có ít nhất 8 ký tự"),
      body("confirmPassword")
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage("Xác nhận mật khẩu không khớp"),
    ],
    changePassword
  );  
  router.post(
    "/forgot-password",
    [body("email").isEmail().withMessage("Email không hợp lệ")],
    forgotPassword
  );
  
  // Route đặt lại mật khẩu bằng OTP
  router.post(
    "/reset-password",
    [
      body("email").isEmail().withMessage("Email không hợp lệ"),
      body("otp").notEmpty().withMessage("OTP không được để trống"),
      body("newPassword").isLength({ min: 8 }).withMessage("Mật khẩu mới phải có ít nhất 8 ký tự"),
    ],
    resetPassword
  );
export default router;