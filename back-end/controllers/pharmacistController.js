import { registerPharmacist } from "../services/pharmacistService.js";

export const registerPharmacistController = async (req, res, next) => {
  try {
    const pharmacist = await registerPharmacist(req.body);
    res.status(201).json(pharmacist);
  } catch (error) {
    next(error);
  }
};
