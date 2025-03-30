import express from "express";
import {
  registerPharmacistController,
  loginPharmacistController,
  getPendingPrescriptionsController,
  getPrescriptionDetailsController,
  updatePrescriptionItemController,
  confirmPrescriptionController,
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
export default router;
