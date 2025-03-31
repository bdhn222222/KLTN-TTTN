import express from "express";
import {
  registerPharmacistController,
  loginPharmacistController,
  getPendingPrescriptionsController,
  getPrescriptionDetailsController,
  updatePrescriptionItemController,
  confirmPrescriptionController,
  getAllMedicinesController,
  addMedicineController,
  updateMedicineController,
  getMedicineByIdController,
} from "../controllers/pharmacistController.js";
import validate from "../middleware/validate.js";
import { body } from "express-validator";
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
router.get(
  "/prescriptions/pending",
  authenticateUser,
  authorize(["pharmacist"]),
  getPendingPrescriptionsController
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
  confirmPrescriptionController
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
export default router;
