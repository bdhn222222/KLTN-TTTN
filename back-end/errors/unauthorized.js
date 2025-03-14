import { StatusCodes } from "http-status-codes";
import CustomError from "./custom_error.js";

class UnauthorizedError extends CustomError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401
  }
}

export default UnauthorizedError;