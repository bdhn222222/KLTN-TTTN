import db from "../models/index.js";
import NotFoundError from "../errors/not_found.js";

const { User } = db;

export const getAllUsers = async () => {
  try {
    const users = await User.findAll({ attributes: { exclude: ["password"] } });
    if (!users || users.length === 0) {
      throw new NotFoundError("No users found");
    }
    return { message: "Get all users successfully", users };
  } catch (error) {
    throw new Error (error.message);
  }
};

export const getUserProfile = async (user_id) => {
  try {
    const user = await User.findByPk(user_id, { attributes: { exclude: ["password"] } });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return { message: "User profile retrieved successfully", user };
  } catch (error) {
    throw new Error (error.message);
  }
};
