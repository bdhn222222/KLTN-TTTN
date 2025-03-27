import { createSpecialization } from "../services/specializationService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";
export const createSpecializationController = async (req, res) => {
  try {
    const result = await createSpecialization(req.body);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof BadRequestError) {
      return res.status(400).json({ message: error.message });
    } else {
      return res
        .status(500)
        .json({ message: new InternalServerError().message });
    }
  }
};
