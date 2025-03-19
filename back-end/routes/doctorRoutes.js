import express from "express";
import { registerDoctorController } from "../controllers/doctorController.js";
import validate from "../middleware/validate.js";
import { body } from "express-validator";

const router = express.Router();
router.post(
    "/register",
    validate([
        body("username").notEmpty().withMessage("Tên đăng nhập không được để trống"),
        body("email").isEmail().withMessage("Email không hợp lệ"),
        body("password").isLength({ min: 8 }).withMessage("Mật khẩu phải có ít nhất 8 ký tự"),
        body("specialization_id").isInt().withMessage("Mã chuyên môn không hợp lệ"),
        body("degree").notEmpty().withMessage("Bằng cấp không được để trống"),
        body("experience_years").isInt({ min: 0 }).withMessage("Số năm kinh nghiệm không hợp lệ"),
        //body("fees").isInt({ min: 0 }).withMessage("Phí khám bệnh không hợp lệ"),
    ]),
    registerDoctorController
)
export default router;