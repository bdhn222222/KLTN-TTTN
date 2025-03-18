import db from "../models/index.js";
import user from "../models/user.js";

const { User } = db;

export const getAllUsers = async () => {
  try {
    const user = await User.findAll({ attributes: { exclude: ["password"] } });
    if (user.length === 0) {
      throw new Error("No user found");
    }
    return { message: "Get all users successfully", user };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getUserProfile = async (user_id) => {
  try {
    const user = await User.findByPk(user_id, { attributes: { exclude: ["password"] } });
    if (user.length === 0) {
      throw new Error("No user found");
    }
    return { message: "Get all users successfully", user };
  } catch (error) {
    throw new Error(error.message);
  }
};

