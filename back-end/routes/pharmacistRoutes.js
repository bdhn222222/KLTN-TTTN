import express from "express";
import { registerPharmacistController, loginPharmacistController } from "../controllers/pharmacistController.js";
import validate from "../middleware/validate.js";
import { body } from "express-validator"
import e from "express";
const router = express.Router();
router.post(
    "/register",
    validate([
        body("username").notEmpty().withMessage("Tên đăng nhập không được để trống"),
        body("email").isEmail().withMessage("Email không hợp lệ"),
        body("license_number").notEmpty().withMessage("Số giấy phép không được để trống"),
      
    ]), 
    registerPharmacistController
),
router.post(
    "/login",
    validate([
      body("email").isEmail().withMessage("Email không hợp lệ"),
      body("password").notEmpty().withMessage("Mật khẩu không được để trống"),
    ]),
    loginPharmacistController
  );
  export default router;