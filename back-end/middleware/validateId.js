import { param } from "express-validator";
import validate from "./validate.js";

const validateId = (idField = "id") => {
  return validate([param(idField).isInt().withMessage("ID không đúng")]);
};

export default validateId;
