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
  updateSpecializationDetailsController,
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
  updateSpecializationDetailsController
);

export default router;
