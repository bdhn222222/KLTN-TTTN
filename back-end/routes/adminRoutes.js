import express from "express";
import multer from "multer";
import {
  registerAdminController,
  loginAdminController,
  getAllPatientsController,
  getPatientAppointmentsController,
  getAllAppointmentsController,
  getAllMedicinesController,
  getAppointmentDetailsController,
  updatePaymentStatusController,
  getAllSpecializationsController,
  getSpecializationDetailsController,
  getDoctorDetailsController,
  updateSpecializationController,
  getAllDoctorsController,
  getDoctorDayOffController,
  createDoctorController,
  updateMedicineDetailsController,
  getMedicineDetailsController,
  createMedicineController,
  getKpiController,
  getTotalPatientsController,
  getAppointmentStatsController,
  acceptAppointmentAdminController,
  cancelAppointmentController,
  updateAppointmentController,
  getDoctorbySpecializationController,
  createSpecializationController,
} from "../controllers/adminController.js";
import { authenticateUser } from "../middleware/authentication.js";
import authorize from "../middleware/authorization.js";
import validate from "../middleware/validate.js";
import { body } from "express-validator";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} from "../middleware/rateLimiter.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

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
  registerLimiter,
  registerAdminController
);
router.post(
  "/login",
  validate([
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").notEmpty().withMessage("Mật khẩu không được để trống"),
  ]),
  loginLimiter,
  loginAdminController
);
router.get(
  "/appointments/stats_by_status",
  authenticateUser,
  authorize(["admin"]),
  getAppointmentStatsController
);
router.get(
  "/patients",
  authenticateUser,
  authorize(["admin"]),
  getAllPatientsController
);
router.get(
  "/patients/:patient_id/appointments",
  authenticateUser,
  authorize(["admin"]),
  getPatientAppointmentsController
);
router.get(
  "/appointments",
  authenticateUser,
  authorize(["admin"]),
  getAllAppointmentsController
);
router.get(
  "/medicines",
  authenticateUser,
  authorize(["admin"]),
  getAllMedicinesController
);

router.get(
  "/appointments/:appointment_id",
  authenticateUser,
  authorize(["admin"]),
  getAppointmentDetailsController
);
router.patch(
  "/payments/:payment_id/status",
  authenticateUser,
  authorize(["admin"]),
  updatePaymentStatusController
);
router.get(
  "/specializations",
  authenticateUser,
  authorize(["admin"]),
  getAllSpecializationsController
);
router.get(
  "/specializations/:specialization_id",
  authenticateUser,
  authorize(["admin"]),
  getSpecializationDetailsController
);
router.get(
  "/doctors/:doctor_id",
  authenticateUser,
  authorize(["admin"]),
  getDoctorDetailsController
);

router.patch(
  "/specializations/:specialization_id",
  authenticateUser,
  authorize(["admin"]),
  upload.single("image"), // 🟢 để multer đọc file từ FormData
  updateSpecializationController
);
router.get(
  "/doctors",
  authenticateUser,
  authorize(["admin"]),
  getAllDoctorsController
);
router.get(
  "/doctors/:doctor_id",
  authenticateUser,
  authorize(["admin"]),
  getDoctorDetailsController
);
router.get(
  "/doctors/:doctor_id/day-off",
  authenticateUser,
  authorize(["admin"]),
  getDoctorDayOffController
);
router.post(
  "/doctors",
  authenticateUser,
  authorize(["admin"]),
  createDoctorController
);
router.patch(
  "/medicines/:medicine_id",
  authenticateUser,
  authorize(["admin"]),
  updateMedicineDetailsController
);

router.get(
  "/medicines/:medicine_id",
  authenticateUser,
  authorize(["admin"]),
  getMedicineDetailsController
);

router.post(
  "/medicines",
  authenticateUser,
  authorize(["admin"]),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
    body("price")
      .isInt({ min: 0 })
      .withMessage("Price must be a non-negative integer"),
    body("unit").notEmpty().withMessage("Unit is required"),
    body("expiry_date")
      .isISO8601()
      .withMessage("Expiry date must be a valid date"),
    body("supplier").optional().isString(),
    body("description").optional().isString(),
  ],
  createMedicineController
);

router.get("/kpi", authenticateUser, authorize(["admin"]), getKpiController);
router.get(
  "/patients/total",
  authenticateUser,
  authorize(["admin"]),
  getTotalPatientsController
);
router.patch(
  "/appointments/:appointment_id/accept",
  authenticateUser,
  authorize(["admin"]),
  acceptAppointmentAdminController
);
router.patch(
  "/appointments/:appointment_id/cancel",
  authenticateUser,
  authorize(["admin"]),
  cancelAppointmentController
);
router.patch(
  "/appointments/:appointment_id/update",
  authenticateUser,
  authorize(["admin"]),
  updateAppointmentController
);
router.get(
  "/doctors/specialization/:specialization_id",
  authenticateUser,
  authorize(["admin"]),
  getDoctorbySpecializationController
);
router.post(
  "/specializations",
  authenticateUser,
  authorize(["admin"]),
  upload.single("image"),
  createSpecializationController
);
export default router;
