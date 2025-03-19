import CustomError from "../errors/custom_error.js";

const errorHandler = (err, req, res, next) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error("Unhandled Error:", err);
  return res.status(500).json({ error: "Internal Server Error" });
};

export default errorHandler;