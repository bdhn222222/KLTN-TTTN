import bcrypt from 'bcryptjs';
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import Doctor from "../models/doctors.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
const { User, Doctor } = db;
export const registerDoctor = async ({ username, email, password, specialization_id, degree, experience_years, description, fees }) => {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new BadRequestError("Email đã được đăng ký từ trước");
  
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: "doctor",
    });
    const newDoctor = await Doctor.create({
      user_id: newUser.user_id,
      specialization_id,
      degree,
      experience_years,
      description,
      fees,
    });
    return { message: "Đăng ký account Bác sĩ thành công", doctor: newDoctor };
  };
export const loginDoctor = async ({ email, password }) => {
    const user = await User.findOne({ where: { email, role: "doctor" }, include: { model: Doctor, as: "doctor" } });
    if (!user) {
        throw new NotFoundError("Không tìm thấy tài khoản Bác sĩ");
      }
}
