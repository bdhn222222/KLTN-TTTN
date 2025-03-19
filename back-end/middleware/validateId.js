import BadRequestError from "../errors/bad_request.js";

const validateId = (idField = "id") => {
  return (req, res, next) => {
    if (!Number.isInteger(Number(req.params[idField]))) {
      throw new BadRequestError("ID không hợp lệ");
    }
    next();
  };
};

export default validateId;
