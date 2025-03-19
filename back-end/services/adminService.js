import bcrypt from 'bcryptjs';
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import Admin from "../models/admins.js";
const { User, Admin } = db;
export const registerAdmin = async ({ username, email, password }) => {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new BadRequestError("Email is already registered");
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });
  
    const newAdmin = await Admin.create({ user_id: newUser.user_id });
  
    return { message: "Admin registered successfully", admin: newAdmin };
  };