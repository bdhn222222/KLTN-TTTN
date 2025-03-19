import { registerDoctor } from "../services/doctorService.js";

export const registerDoctorController = async (req, res, next) => {
  try {
    const doctor = await registerDoctor(req.body);
    res.status(201).json(doctor);
  } catch (error) {
    next(error);
  }
};