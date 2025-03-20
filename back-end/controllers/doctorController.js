import { registerDoctor, loginDoctor } from "../services/doctorService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";

export const registerDoctorController = async (req, res, next) => {
  try {
    const doctor = await registerDoctor(req.body);
    res.status(201).json(doctor);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
export const loginDoctorController = async (req, res, next) => {
  try{
    const doctor = await loginDoctor(req.body);
    res.status(200).json(doctor);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
}