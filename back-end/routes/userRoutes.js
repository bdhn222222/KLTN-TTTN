import express from "express";
import {
  getAllUsersController,
  getUserProfileController,
} from "../controllers/userController.js";
import validateId from "../middleware/validateId.js";
import { authenticateUser } from "../middleware/authentication.js";

const router = express.Router();

router.get("/", getAllUsersController);
router.get("/:user_id", validateId("user_id"), getUserProfileController);
// router.get("/profile", authenticateUser, getUserProfileController2);

export default router;
