import jwt from "jsonwebtoken";
import config from "../config/config.js";
import UnauthorizedError from "../errors/unauthorized.js";

export const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError("Invalid token");
  }
};
