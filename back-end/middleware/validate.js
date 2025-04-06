import { validationResult } from "express-validator";
import BadRequestError from "../errors/bad_request.js";

const validate = (validations) => {
  return async (req, res, next) => {
    try {
      // Thực hiện tất cả các validation rules
      await Promise.all(validations.map((validation) => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }));
        
        // Nếu có nhiều lỗi, gộp tất cả vào một mảng
        if (errorMessages.length > 1) {
          throw new BadRequestError("Dữ liệu không hợp lệ", errorMessages);
        }
        
        // Nếu chỉ có một lỗi, trả về message của lỗi đó
        throw new BadRequestError(errorMessages[0].message);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validate;
