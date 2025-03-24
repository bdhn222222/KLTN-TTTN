import bcrypt from 'bcryptjs';
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import Doctor from "../models/doctors.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
import ForbiddenError from "../errors/forbidden.js";
const { User, Doctor } = db;
export const registerDoctor = async ({ username, email, password, specialization_id, degree, experience_years, description, fees }) => {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new BadRequestError("Email đã được đăng ký");
  
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
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if(!isPasswordValid) throw new UnauthorizedError("Mật khẩu không chính xác");
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
       process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    return {
      message: "Đăng nhập thành công",
      token,
      doctor: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        role: user.role,
        specialization_id: user.doctor.specialization_id,
        degree: user.doctor.degree,
        experience_years: user.doctor.experience_years,
        fees: user.doctor.fees,
      },
    };
}

export const updateDoctorProfile = async (user_id, data, authenticatedUser) => {
  if (authenticatedUser.user_id !== user_id && authenticatedUser.role !== "admin") {
    throw new ForbiddenError("Bạn không có quyền cập nhật thông tin bác sĩ này");
  }

  const user = await User.findOne({ where: { user_id, role: "doctor" }, include: { model: Doctor, as: "doctor" } });

  if (!user) {
    throw new NotFoundError("Bác sĩ không tồn tại");
  }

  // Cập nhật bảng User
  if (data.username) user.username = data.username;
  if (data.email) user.email = data.email;

  // Cập nhật bảng Doctor
  if (data.specialization_id) user.doctor.specialization_id = data.specialization_id;
  if (data.degree) user.doctor.degree = data.degree;
  if (data.experience_years) user.doctor.experience_years = data.experience_years;
  if (data.fees) user.doctor.fees = data.fees;
  if (data.description) user.doctor.description = data.description;

  await user.save();
  await user.doctor.save();

  return {
    message: "Cập nhật thông tin bác sĩ thành công",
    doctor: {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      specialization_id: user.doctor.specialization_id,
      degree: user.doctor.degree,
      experience_years: user.doctor.experience_years,
      fees: user.doctor.fees,
      description: user.doctor.description,
    },
  };
};