import express from "express";
import multer from "multer";
import {
  registerDoctorController,
  loginDoctorController,
  createDoctorDayOffController,
  getAllAppointmentsController,
  getDoctorSummaryController,
  getDoctorAppointmentStatsController,
  getAppointmentDetailsController,
  acceptAppointmentController,
  cancelAppointmentController,
  markPatientNotComingController,
  completeAppointmentController,
  getDoctorDayOffsController,
  cancelDoctorDayOffController,
  createMedicalRecordController,
  createPrescriptionsController,
  getAppointmentPaymentsController,
  updatePaymentStatusController,
  getAllMedicinesController,
  getAllPatient_FamilyMemberController,
  getPatientAppointmentsController,
  getDoctorProfileController,
  updateDoctorProfileController,
  getFamilyMemberDetailsController,
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
const storage = multer.memoryStorage();
const upload = multer({ storage });
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
  getAllAppointmentsController
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

// Payment routes
router.get(
  "/appointments/payments",
  authenticateUser,
  authorize(["doctor"]),
  getAppointmentPaymentsController
);
router.patch(
  "/appointments/payments/:payment_id/status",
  authenticateUser,
  authorize(["doctor"]),
  updatePaymentStatusController
);

router.get(
  "/appointments/:appointment_id",
  authenticateUser,
  authorize(["doctor"]),
  getAppointmentDetailsController
);
router.patch(
  "/appointments/:appointment_id/accept",
  authenticateUser,
  authorize(["doctor"]),
  validate([
    param("appointment_id").notEmpty().withMessage("Thiếu mã cuộc hẹn"),
  ]),
  acceptAppointmentController
);

router.post(
  "/appointments/:id/mark-not-coming",
  authenticateUser,
  authorize(["doctor"]),
  markPatientNotComingController
);
router.post(
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
router.post(
  "/day-offs/:id",
  authenticateUser,
  authorize(["doctor"]),
  cancelDoctorDayOffController
);

router.post(
  "/appointments/:id/cancel",
  authenticateUser,
  authorize(["doctor"]),
  validate([
    param("id")
      .notEmpty()
      .withMessage("Thiếu mã cuộc hẹn")
      .isInt()
      .withMessage("Mã cuộc hẹn phải là số"),
    body("reason")
      .notEmpty()
      .withMessage("Vui lòng nhập lý do nghỉ")
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Lý do nghỉ phải từ 3 đến 200 ký tự"),
  ]),
  cancelAppointmentController
);
router.post(
  "/medical-records",
  authenticateUser,
  authorize(["doctor"]),
  createMedicalRecordController
);
router.post(
  "/appointments/complete",
  authenticateUser,
  authorize(["doctor"]),
  completeAppointmentController
);
router.post(
  "/prescriptions",
  authenticateUser,
  authorize(["doctor"]),
  [
    body("appointment_id").notEmpty().withMessage("Thiếu mã cuộc hẹn"),
    body("medicines").isArray().withMessage("Danh sách thuốc không hợp lệ"),
    body("medicines.*.medicine_id").notEmpty().withMessage("Thiếu mã thuốc"),
    body("medicines.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Số lượng thuốc không hợp lệ"),
    body("medicines.*.dosage").notEmpty().withMessage("Thiếu liều dùng"),
    body("medicines.*.frequency").notEmpty().withMessage("Thiếu tần suất dùng"),
    body("medicines.*.duration").notEmpty().withMessage("Thiếu thời gian dùng"),
    body("medicines.*.instructions")
      .optional()
      .isString()
      .withMessage("Hướng dẫn sử dụng không hợp lệ"),
    body("note").optional().isString().withMessage("Ghi chú không hợp lệ"),
    body("use_hospital_pharmacy")
      .notEmpty()
      .withMessage("Thiếu thông tin sử dụng nhà thuốc bệnh viện")
      .isBoolean()
      .withMessage("Tham số use_hospital_pharmacy không hợp lệ"),
  ],
  createPrescriptionsController
);
router.get(
  "/medicines",
  authenticateUser,
  authorize(["doctor"]),
  getAllMedicinesController
);

// Patient routes for doctor
router.get(
  "/patients",
  authenticateUser,
  authorize(["doctor"]),
  getAllPatient_FamilyMemberController
);

router.get(
  "/patients/:family_member_id",
  authenticateUser,
  authorize(["doctor"]),
  getFamilyMemberDetailsController
);

router.get(
  "/patients/:patient_id/appointments",
  authenticateUser,
  authorize(["doctor"]),
  getPatientAppointmentsController
);

// Thêm route cho getDoctorProfile
router.get(
  "/profile",
  authenticateUser,
  authorize(["doctor"]),
  getDoctorProfileController
);
router.patch(
  "/profile",
  authenticateUser,
  authorize(["doctor"]),
  upload.single("avatar"),
  updateDoctorProfileController
);

export default router;
