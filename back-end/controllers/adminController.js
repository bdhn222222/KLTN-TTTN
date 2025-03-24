import { registerAdmin, loginAdmin } from "../services/adminService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";

export const registerAdminController = async (req, res, next) => {
    try {
      const admin = await registerAdmin(req.body);
      res.status(201).json(admin);
    } catch (error) {
      if (error instanceof BadRequestError) {
        next(error);
      } else {
        next(new InternalServerError(error.message));
      }
    }
  };
  export const loginAdminController = async (req, res, next) => {
    try {
      const admin = await loginAdmin(req.body);
      res.status(200).json(admin);
    }
    catch (error) {
      if (error instanceof BadRequestError) {
        next(error);
      } else {
        next(new InternalServerError(error.message));
      }
    }
  }