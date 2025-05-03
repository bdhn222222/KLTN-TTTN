import express from "express";
import {
  registerPatientController,
  loginPatientController,
  getAllSpecializationsController,
  getAllDoctorsController,
  getDoctorProfileController,
  verifyEmailController,
  bookAppointmentController,
  changePasswordController,
  addFamilyMemberController,
  getFamilyMembersController,
  updateFamilyMemberController,
  getAllAppointmentsController,
  //bookSymptomsAppointmentController,
  getFamilyMemberByIdController,
  getAllSymptomsController,
  getDoctorDayOffController,
  getDoctorBySymptomsController,
  cancelAppointmentController,
  getAppointmentByIdController,
  createMomoPaymentController,
  handleCallbackController,
} from "../controllers/patientController.js";
import validate from "../middleware/validate.js";
import { body } from "express-validator";
import { authenticateUser } from "../middleware/authentication.js";
import authorize from "../middleware/authorization.js";
import { query } from "express-validator";
const router = express.Router();
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter.js";
import * as paymentController from "../controllers/paymentController.js";

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
  loginLimiter,
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
      .withMessage("Thời gian hẹn không hợp lệ"),
  ]),
  bookAppointmentController
);
router.get(
  "/appointments",
  authenticateUser,
  authorize(["patient"]),
  validate([
    query("family_member_id")
      .optional()
      .isInt()
      .withMessage("ID thành viên gia đình phải là số"),
    query("appointmentStatus")
      .optional()
      .isIn([
        "waiting_for_confirmation",
        "accepted",
        "completed",
        "cancelled",
        "doctor_day_off",
        "patient_not_coming",
      ])
      .withMessage("Trạng thái lịch hẹn không hợp lệ"),
    query("paymentStatus")
      .optional()
      .isIn(["pending", "paid", "failed"])
      .withMessage("Trạng thái thanh toán không hợp lệ"),
  ]),
  getAllAppointmentsController
);
router.get(
  "/appointments/:id",
  authenticateUser,
  authorize(["patient"]),
  getAppointmentByIdController
);
router.post(
  "/add-family-member",
  authenticateUser,
  authorize(["patient"]),
  addFamilyMemberController
);
router.get(
  "/family-members",
  authenticateUser,
  authorize(["patient"]),
  getFamilyMembersController
);

router.get(
  "/family-members/:family_member_id",
  authenticateUser,
  authorize(["patient"]),
  getFamilyMemberByIdController
);

router.post(
  "/change-password",
  authenticateUser,
  authorize(["patient"]),
  changePasswordController
);
router.patch(
  "/family-members/:family_member_id",
  authenticateUser,
  authorize(["patient"]),
  updateFamilyMemberController
);

// router.post(
//   "/book-symptoms-appointment",
//   authenticateUser,
//   authorize(["patient"]),
//   validate([
//     body("symptoms")
//       .isArray()
//       .withMessage("Danh sách triệu chứng phải là mảng")
//       .notEmpty()
//       .withMessage("Danh sách triệu chứng không được để trống"),
//     body("appointment_datetime")
//       .notEmpty()
//       .withMessage("Thời gian hẹn không được để trống")
//       .isISO8601()
//       .withMessage("Thời gian hẹn không hợp lệ"),
//     body("family_member_id")
//       .notEmpty()
//       .withMessage("ID người thân không được để trống")
//       .isInt()
//       .withMessage("ID người thân phải là số"),
//     body("family_member_data")
//       .notEmpty()
//       .withMessage("Thông tin người thân không được để trống")
//       .isObject()
//       .withMessage("Thông tin người thân không hợp lệ"),
//     body("family_member_data.username")
//       .notEmpty()
//       .withMessage("Tên người thân không được để trống"),
//     body("family_member_data.dob")
//       .notEmpty()
//       .withMessage("Ngày sinh người thân không được để trống")
//       .isISO8601()
//       .withMessage("Ngày sinh không hợp lệ"),
//     body("family_member_data.phone_number")
//       .notEmpty()
//       .withMessage("Số điện thoại người thân không được để trống"),
//     body("family_member_data.gender")
//       .notEmpty()
//       .withMessage("Giới tính người thân không được để trống")
//       .isIn(["male", "female"])
//       .withMessage("Giới tính không hợp lệ"),
//   ]),
//   bookSymptomsAppointmentController
// );

// Route để lấy danh sách triệu chứng
router.get(
  "/symptoms",
  authenticateUser,
  authorize(["patient"]),
  getAllSymptomsController
);

// Get doctor's day off information
router.get("/doctor/:doctor_id/day-off", getDoctorDayOffController);

router.post(
  "/doctor-by-symptoms",
  authenticateUser,
  authorize(["patient"]),
  getDoctorBySymptomsController
);

router.post(
  "/appointments/:id/cancel",
  authenticateUser,
  authorize(["patient"]),
  validate([
    body("reason")
      .notEmpty()
      .withMessage("Lý do hủy lịch không được để trống")
      .isLength({ min: 3, max: 200 })
      .withMessage("Lý do phải từ 3 đến 200 ký tự"),
  ]),
  cancelAppointmentController
);

// Payment routes
router.post(
  "/appointments/:appointment_id/payment/create",
  authenticateUser,
  authorize(["patient"]),
  paymentController.createMomoPayment
);

router.post(
  "/appointments/:appointment_id/payment/callback",
  paymentController.handleMomoCallback
);

router.get(
  "/appointments/:appointment_id/payment/verify",
  authenticateUser,
  authorize(["patient"]),
  paymentController.verifyPayment
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
