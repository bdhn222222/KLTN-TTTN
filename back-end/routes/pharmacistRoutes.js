import express from "express";
import {
  registerPharmacistController,
  loginPharmacistController,
  //  getPendingPrescriptionsController,
  getPrescriptionDetailsController,
  updatePrescriptionItemController,
  completePrescriptionController,
  getAllMedicinesController,
  addMedicineController,
  updateMedicineController,
  getMedicineByIdController,
  deleteMedicineController,
  getPharmacistProfileController,
  updatePharmacistProfileController,
  changePharmacistPasswordController,
  getAllPrescriptionsController,
  confirmPrescriptionPreparationController,
  updatePrescriptionPaymentStatusController,
  rejectPrescriptionController,
  getAllPrescriptionPaymentsController,
  createRetailPrescriptionController,
  getAllRetailPrescriptionsController,
  getRetailPrescriptionDetailsController,
  updateRetailPrescriptionController,
  updateRetailPrescriptionStatusController,
  updateRetailPrescriptionPaymentStatusController,
  completeRetailPrescriptionController,
  getAllRetailPrescriptionPaymentsController,
  cancelRetailPrescriptionController,
  getPrescriptionDetailsWithFIFOController,
} from "../controllers/pharmacistController.js";
import validate from "../middleware/validate.js";
import { body, query, param } from "express-validator";
import { authenticateUser } from "../middleware/authentication.js";
import authorize from "../middleware/authorization.js";
import e from "express";
const router = express.Router();
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter.js";
router.post(
  "/register",
  validate([
    body("username")
      .notEmpty()
      .withMessage("Tên đăng nhập không được để trống"),
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("license_number")
      .notEmpty()
      .withMessage("Số giấy phép không được để trống"),
  ]),
  registerLimiter,
  registerPharmacistController
),
  router.post(
    "/login",
    validate([
      body("email").isEmail().withMessage("Email không hợp lệ"),
      body("password").notEmpty().withMessage("Mật khẩu không được để trống"),
    ]),
    loginLimiter,
    loginPharmacistController
  );
// router.get(
//   "/prescriptions/pending",
//   authenticateUser,
//   authorize(["pharmacist"]),
//   getPendingPrescriptionsController
// );
router.get(
  "/prescriptions/payments",
  authenticateUser,
  authorize(["pharmacist"]),
  validate([
    query("status")
      .optional()
      .isIn(["pending", "paid", "cancelled"])
      .withMessage("Trạng thái thanh toán không hợp lệ"),
    query("start_date")
      .optional()
      .isISO8601()
      .withMessage("Ngày bắt đầu không hợp lệ"),
    query("end_date")
      .optional()
      .isISO8601()
      .withMessage("Ngày kết thúc không hợp lệ"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Số trang phải lớn hơn 0"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Số bản ghi trên mỗi trang phải từ 1-100"),
  ]),
  getAllPrescriptionPaymentsController
);
router.get(
  "/prescriptions/:prescription_id",
  authenticateUser,
  authorize(["pharmacist"]),
  getPrescriptionDetailsController
);
router.patch(
  "/prescriptions/:prescription_id/update-item",
  authenticateUser,
  authorize(["pharmacist"]),
  updatePrescriptionItemController
);
router.patch(
  "/prescriptions/:prescription_id/confirm",
  authenticateUser,
  authorize(["pharmacist"]),
  completePrescriptionController
);
router.patch(
  "/prescriptions/:prescription_id/confirm-preparation",
  authenticateUser,
  authorize(["pharmacist"]),
  validate([
    body("payment_method")
      .optional()
      .isIn(["cash", "card", "transfer", "momo", "vnpay", "zalopay"])
      .withMessage("Phương thức thanh toán không hợp lệ"),
  ]),
  confirmPrescriptionPreparationController
);
router.patch(
  "/prescriptions/:prescription_id/reject",
  authenticateUser,
  authorize(["pharmacist"]),
  validate([
    body("reason").notEmpty().withMessage("Lý do từ chối không được để trống"),
  ]),
  rejectPrescriptionController
);
router.get(
  "/medicines",
  authenticateUser,
  authorize(["pharmacist"]),
  getAllMedicinesController
);
router.post(
  "/medicines/add",
  authenticateUser,
  authorize(["pharmacist"]),
  validate([
    body("name").notEmpty().withMessage("Tên thuốc không được để trống"),
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Số lượng phải là số nguyên >= 0"),
    body("price").isInt({ min: 0 }).withMessage("Giá phải là số nguyên >= 0"),
    body("unit").notEmpty().withMessage("Đơn vị không được để trống"),
    body("expiry_date").isISO8601().withMessage("Ngày hết hạn không hợp lệ"),
  ]),
  addMedicineController
);
router.put(
  "/medicines/:id",
  authenticateUser,
  authorize(["pharmacist"]),
  validate([
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Tên thuốc không được để trống"),
    body("quantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Số lượng phải là số nguyên >= 0"),
    body("price")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Giá phải là số nguyên >= 0"),
    body("unit")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Đơn vị không được để trống"),
    body("expiry_date")
      .optional()
      .isISO8601()
      .withMessage("Ngày hết hạn không hợp lệ")
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error("Ngày hết hạn phải lớn hơn hiện tại");
        }
        return true;
      }),
    body("description").optional(),
    body("supplier").optional(),
  ]),
  updateMedicineController
);
router.get(
  "/medicines/:id",
  authenticateUser,
  authorize(["pharmacist"]),
  getMedicineByIdController
);
router.delete(
  "/medicines/:id",
  authenticateUser,
  authorize(["pharmacist"]),
  deleteMedicineController
);
router.get(
  "/profile",
  authenticateUser,
  authorize(["pharmacist"]),
  getPharmacistProfileController
);
router.put(
  "/profile",
  authenticateUser,
  authorize(["pharmacist"]),
  updatePharmacistProfileController
);
router.put(
  "/change-password",
  authenticateUser,
  authorize(["pharmacist"]),
  changePharmacistPasswordController
);
router.get(
  "/prescriptions",
  authenticateUser,
  authorize(["pharmacist"]),
  validate([
    query("start_date")
      .optional()
      .isISO8601()
      .withMessage("Ngày bắt đầu không hợp lệ"),
    query("end_date")
      .optional()
      .isISO8601()
      .withMessage("Ngày kết thúc không hợp lệ"),
    query("date").optional().isISO8601().withMessage("Ngày không hợp lệ"),
    query("payment_status")
      .optional()
      .isIn(["pending", "paid", "cancelled"])
      .withMessage("Trạng thái thanh toán không hợp lệ"),
    query("dispensed_status")
      .optional()
      .isBoolean()
      .withMessage("Trạng thái phát thuốc không hợp lệ"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Số trang phải lớn hơn 0"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Số bản ghi trên mỗi trang phải từ 1-100"),
  ]),
  getAllPrescriptionsController
);
router.patch(
  "/prescriptions/payments/:prescription_payment_id/status",
  authenticateUser,
  authorize(["pharmacist"]),
  validate([
    param("prescription_payment_id")
      .notEmpty()
      .withMessage("Thiếu mã thanh toán đơn thuốc")
      .isInt()
      .withMessage("Mã thanh toán đơn thuốc phải là số"),
    body("payment_method")
      .notEmpty()
      .withMessage("Thiếu phương thức thanh toán")
      .isIn(["cash", "zalopay"])
      .withMessage("Phương thức thanh toán không hợp lệ"),
    body("note")
      .optional()
      .isString()
      .withMessage("Ghi chú phải là chuỗi")
      .isLength({ max: 255 })
      .withMessage("Ghi chú tối đa 255 ký tự"),
  ]),
  updatePrescriptionPaymentStatusController
);
router.post(
  "/prescriptions",
  authenticateUser,
  authorize(["pharmacist"]),
  validate([
    body("patient_id")
      .notEmpty()
      .withMessage("Thiếu thông tin bệnh nhân")
      .isInt({ min: 1 })
      .withMessage("ID bệnh nhân không hợp lệ"),
    body("note")
      .optional()
      .isString()
      .withMessage("Ghi chú phải là chuỗi")
      .isLength({ max: 1000 })
      .withMessage("Ghi chú tối đa 1000 ký tự"),
    body("medicines")
      .isArray({ min: 1 })
      .withMessage("Danh sách thuốc không được rỗng"),
    body("medicines.*.medicine_id")
      .notEmpty()
      .withMessage("Thiếu ID thuốc")
      .isInt({ min: 1 })
      .withMessage("ID thuốc không hợp lệ"),
    body("medicines.*.quantity")
      .notEmpty()
      .withMessage("Thiếu số lượng thuốc")
      .isInt({ min: 1 })
      .withMessage("Số lượng thuốc phải là số nguyên lớn hơn 0"),
    body("medicines.*.dosage")
      .notEmpty()
      .withMessage("Thiếu liều dùng")
      .isString()
      .withMessage("Liều dùng phải là chuỗi"),
    body("medicines.*.frequency")
      .notEmpty()
      .withMessage("Thiếu tần suất sử dụng")
      .isString()
      .withMessage("Tần suất sử dụng phải là chuỗi"),
    body("medicines.*.duration")
      .notEmpty()
      .withMessage("Thiếu thời gian sử dụng")
      .isString()
      .withMessage("Thời gian sử dụng phải là chuỗi"),
    body("medicines.*.instructions")
      .notEmpty()
      .withMessage("Thiếu hướng dẫn sử dụng")
      .isString()
      .withMessage("Hướng dẫn sử dụng phải là chuỗi"),
  ]),
  createRetailPrescriptionController
);
router.post(
  "/retail-prescriptions",
  authenticateUser,
  authorize(["pharmacist"]), // Chỉ cho phép dược sĩ tạo đơn thuốc
  createRetailPrescriptionController
);
router.get(
  "/retail-prescriptions",
  authenticateUser,
  getAllRetailPrescriptionsController
);
router.get(
  "/retail-prescriptions/:retail_prescription_id",
  authenticateUser,
  getRetailPrescriptionDetailsController
);
router.put(
  "/retail-prescriptions/:retail_prescription_id",
  authenticateUser,
  updateRetailPrescriptionController
);
router.patch(
  "/retail-prescriptions/:retail_prescription_id/status",
  authenticateUser,
  updateRetailPrescriptionStatusController
);
router.put(
  "/retail-prescriptions/payments/:payment_id/status",
  authenticateUser,
  updateRetailPrescriptionPaymentStatusController
);
router.patch(
  "/retail-prescriptions/:retail_prescription_id/complete",
  authenticateUser,
  authorize(["pharmacist"]),
  completeRetailPrescriptionController
);
router.get(
  "/retail-prescription-payments",
  authenticateUser,
  authorize(["pharmacist"]),
  getAllRetailPrescriptionPaymentsController
);
router.patch(
  "/retail-prescriptions/:retail_prescription_id/cancel",
  authenticateUser,
  authorize(["pharmacist"]),
  validate([
    body("reason")
      .notEmpty()
      .withMessage("Lý do hủy đơn không được để trống")
      .isString()
      .withMessage("Lý do hủy đơn phải là chuỗi")
      .isLength({ max: 255 })
      .withMessage("Lý do hủy đơn tối đa 255 ký tự"),
  ]),
  cancelRetailPrescriptionController
);
router.get(
  "/prescriptions/fifo/:prescription_id",
  authenticateUser,
  authorize(["pharmacist"]),
  getPrescriptionDetailsWithFIFOController
);
export default router;
