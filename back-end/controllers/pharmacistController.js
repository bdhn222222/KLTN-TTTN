import { registerPharmacist, loginPharmacist } from "../services/pharmacistService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";


export const registerPharmacistController = async (req, res, next) => {
  try {
    const patient = await registerPharmacist(req.body);
    res.status(201).json(patient);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
export const loginPharmacistController = async (req, res, next) => {
  try {
    const patient = await loginPharmacist(req.body);
    res.status(200).json(patient);
  }
  catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
}