import { StatusCodes } from "http-status-codes";
import CustomError from "./custom_error.js";

class InternalServerError extends CustomError {
  constructor(message = "Lỗi hệ thống") {
    super(message);
    this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR; // 500
  }
}

export default InternalServerError;