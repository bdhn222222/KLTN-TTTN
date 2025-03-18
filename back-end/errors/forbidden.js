import { StatusCodes } from "http-status-codes";
import CustomError from "./custom_error.js";

class ForbiddenError extends CustomError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.FORBIDDEN; // 403
  }
}

export default ForbiddenError;