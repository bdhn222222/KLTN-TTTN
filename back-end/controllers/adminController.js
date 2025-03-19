import { registerAdmin } from "../services/adminService.js";

export const registerAdminController = async (req, res, next) => {
  try {
    const admin = await registerAdmin(req.body);
    res.status(201).json(admin);
  } catch (error) {
    next(error);
  }
};
