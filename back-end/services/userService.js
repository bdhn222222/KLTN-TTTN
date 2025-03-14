import db from "../models/index.js";

const { User } = db;

export const findUserByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

export const createUser = async (userData) => {
  return await User.create(userData); // Không cần `user_id`, Sequelize tự thêm `id`
};
