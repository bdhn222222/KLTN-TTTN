import db from "../models/index.js";
import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
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
  
    const newAdmin = await Admin.create({
        user_id: newUser.user_id,
      });
  
    return { message: "Admin registered successfully", admin: newAdmin };
  };
export const loginAdmin = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new BadRequestError("Email or password is incorrect");
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) throw new BadRequestError("Email or password is incorrect");
  const token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  return {
    message: "Đăng nhập thành công",
    token,
    admin: {
      admin: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    },
  };
}