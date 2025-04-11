import express from "express";
import {
  registerPatientController,
  loginPatientController,
  getAllSpecializationsController,
  getAllDoctorsController,
  getDoctorProfileController,
  verifyEmailController,
  bookAppointmentController,
  changePasswordController
} from "../controllers/patientController.js";
import validate from "../middleware/validate.js";
import { body } from "express-validator";
import { authenticateUser } from "../middleware/authentication.js";
import authorize from "../middleware/authorization.js";
import { query } from "express-validator";
const router = express.Router();
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter.js";
router.post(
  "/register",
  // registerLimiter,
  registerPatientController
);

router.get("/verify", verifyEmailController);

router.post(
  "/login",
  validate([
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").notEmpty().withMessage("Mật khẩu không được để trống"),
  ]),
  // loginLimiter,
  loginPatientController
);
router.get("/specializations", getAllSpecializationsController);

router.get("/doctors", getAllDoctorsController);
router.get("/doctors/:id", getDoctorProfileController);
router.post(
  "/appointments",
  authenticateUser,
  authorize(["patient"]),
  validate([
    body("doctor_id")
      .notEmpty()
      .withMessage("ID bác sĩ không được để trống")
      .isInt()
      .withMessage("ID bác sĩ phải là số"),
    body("appointment_datetime")
      .notEmpty()
      .withMessage("Thời gian hẹn không được để trống")
      .isISO8601()
      .withMessage("Thời gian hẹn không hợp lệ")
  ]),
  bookAppointmentController
);

router.post("/change-password", authenticateUser, authorize(["patient"]), changePasswordController);

export default router;

// import upload from "../middleware/uploadHandler.js";

// // Upload 1 ảnh đại diện
// router.post("/upload-avatar", upload.single("avatar"), (req, res) => {
//   return res.json({
//     message: "Upload thành công",
//     imageUrl: req.file.path, // Đây là URL trên Cloudinary
//   });
// });
