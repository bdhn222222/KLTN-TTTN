import express from "express";
import {
  registerDoctorController,
  loginDoctorController,
  createDoctorDayOffController,
  getDoctorAppointmentsController,
  getDoctorSummaryController,
  getDoctorAppointmentStatsController,
  getAppointmentDetailsController,
  acceptAppointmentController,
  cancelAppointmentController,
  markPatientNotComingController,
  completeAppointmentController,
  getDoctorDayOffsController,
  cancelDoctorDayOffController,
} from "../controllers/doctorController.js";
import validate from "../middleware/validate.js";
import { body, param } from "express-validator";
import { authenticateUser } from "../middleware/authentication.js";
import authorize from "../middleware/authorization.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} from "../middleware/rateLimiter.js";
const router = express.Router();
const app = express();
app.use(express.json());
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
    body("specialization_id").isInt().withMessage("Mã chuyên môn không hợp lệ"),
    body("degree").notEmpty().withMessage("Bằng cấp không được để trống"),
    body("experience_years")
      .isInt({ min: 0 })
      .withMessage("Số năm kinh nghiệm không hợp lệ"),
    //body("fees").isInt({ min: 0 }).withMessage("Phí khám bệnh không hợp lệ"),
  ]),
  registerLimiter,
  registerDoctorController
);
router.post(
  "/login",
  validate([
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").notEmpty().withMessage("Mật khẩu không được để trống"),
  ]),
  loginLimiter,
  loginDoctorController
);

router.post(
  "/day-offs",
  authenticateUser,
  authorize(["doctor"]),
  createDoctorDayOffController
);
router.get(
  "/appointments",
  authenticateUser,
  authorize(["doctor"]),
  getDoctorAppointmentsController
);
router.get(
  "/summary",
  authenticateUser,
  authorize(["doctor"]),
  getDoctorSummaryController
);
router.get(
  "/appointments/stats",
  authenticateUser,
  authorize(["doctor"]),
  getDoctorAppointmentStatsController
);
router.get(
  "/appointments/:appointment_id",
  authenticateUser,
  authorize(["doctor"]),
  getAppointmentDetailsController
);
router.put(
  "/appointments/:appointment_id/accept",
  authenticateUser,
  authorize(["doctor"]),
  validate([
    param("appointment_id").notEmpty().withMessage("Thiếu mã cuộc hẹn")
  ]),
  acceptAppointmentController
);

router.put(
  "/appointments/:id/mark-not-coming",
  authenticateUser,
  authorize(["doctor"]),
  markPatientNotComingController
);
router.put(
  "/appointments/:id/complete",
  authenticateUser,
  authorize(["doctor"]),
  completeAppointmentController
);
router.get(
  "/day-offs",
  authenticateUser,
  authorize(["doctor"]),
  getDoctorDayOffsController
);
router.put(
  "/day-offs/:id",
  authenticateUser,
  authorize(["doctor"]),
  cancelDoctorDayOffController
);

router.put(
  '/appointments/:id/cancel',
  authenticateUser,
  authorize(['doctor']),
  validate([
    param('id')
      .notEmpty()
      .withMessage('Thiếu mã cuộc hẹn')
      .isInt()
      .withMessage('Mã cuộc hẹn phải là số'),
    body('reason')
      .notEmpty()
      .withMessage('Vui lòng nhập lý do nghỉ')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Lý do nghỉ phải từ 3 đến 200 ký tự'),
  ]),
  cancelAppointmentController
);


export default router;
