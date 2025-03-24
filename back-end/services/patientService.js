import bcrypt from 'bcryptjs';
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import Patient from "../models/patients.js";
import User from "../models/users.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
const { User, Patient } = db;
export const registerPatient = async ({username, email, password, date_of_birth, gender, phone_number, insurance_number, id_number}) => {
  const existingPatient = await User.findOne({ where: { email } });
  if(existingPatient) throw new BadRequestError("Email đã được đăng ký");
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = await User.create({ username, email, password: hashedPassword });
  const newPatient = await Patient.create({ 
    user_id: newUser.id,
    date_of_birth,
    gender,
    phone_number, 
    insurance_number,
    id_number,
    is_verified: false,
  })
  return { message: "Đăng ký account bệnh nhân thành công", patient: newPatient };
}
export const loginPatient = async ({ email, password }) => {
  const user = await User.findOne({ where: { email, role: "patient" }, include: {model: Patient, as: "patient"}});
  if (!user) {
    throw new NotFoundError("Bệnh nhân không tồn tại hoặc email không đúng");
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Mật khẩu không chính xác");
  }
  const token = jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    message: "Đăng nhập thành công",
    token,
    patient: {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role,
      date_of_birth: user.patient.date_of_birth,
      gender: user.patient.gender,
      address: user.patient.address,
      phone_number: user.patient.phone_number,
      insurance_number: user.patient.insurance_number,
      id_number: user.patient.id_number,
      is_verified: user.patient.is_verified,
    },
  };
};