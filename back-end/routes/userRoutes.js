import express from "express";
import { getAllUsersController, getUserProfileController } from "../controllers/userController.js";
import validateId from "../middleware/validateId.js";

const router = express.Router();

router.get("/", getAllUsersController);
router.get("/:user_id", validateId("user_id"), getUserProfileController);

export default router;