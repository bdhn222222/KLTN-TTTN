import CustomError from "../errors/custom_error.js";

const errorHandler = (err, req, res, next) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error("Lỗi không xác định:", err);
  return res.status(500).json({ error: "Lỗi hệ thống" });
};

export default errorHandler;
