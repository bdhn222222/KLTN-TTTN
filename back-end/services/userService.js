import db from "../models/index.js";

const { User } = db;

export const findUserByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

export const createUser = async (userData) => {
  return await User.create(userData);
};

export const getAllUsers = async () => {
  
  const allUsers =  await User.findAll({ attributes: ["id", "name", "email", "role", "status"] });
  const count = await User.count();
  if(!count) {
    return { message: "Không có người dùng nào", data: [] }
  }
  return allUsers
};

export const updateUser = async (id, updatedData) => {
  if (!updatedData || Object.keys(updatedData).length === 0) { 
  }
  return await User.update(updatedData, { where: { id: id } }); 
};
export const findUserById = async(id)=>{
  return await User.findOne({ where: { id } });
}
