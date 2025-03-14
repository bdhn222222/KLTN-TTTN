import { StatusCodes } from "http-status-codes";
import CustomError from "./custom_error.js";

class BadRequestError extends CustomError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.BAD_REQUEST; // 400
  }
}

export default BadRequestError;