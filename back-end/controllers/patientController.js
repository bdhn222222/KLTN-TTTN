import { registerPatient } from "../services/patientService.js";

export const registerPatientController = async (req, res, next) => {
  try {
    const patient = await registerPatient(req.body);
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};
