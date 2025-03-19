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