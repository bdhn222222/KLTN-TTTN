import { registerPatient, loginPatient } from "../services/patientService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";


export const registerPatientController = async (req, res, next) => {
  try {
    const patient = await registerPatient(req.body);
    res.status(201).json(patient);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
export const loginPatientController = async (req, res, next) => {
  try {
    const patient = await loginPatient(req.body);
    res.status(200).json(patient);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};