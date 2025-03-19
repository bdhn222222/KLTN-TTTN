import bcrypt from 'bcryptjs';
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import Patient from "../models/patients.js";
const { User, Patient } = db;
export const registerPatient = async ({ username, email, password, date_of_birth, gender, address, phone_number, insurance_number, id_number }) => {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new BadRequestError("Email already exists"); 
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    username,
    email,
    password: hashedPassword,
    role: "patient",
  });
  const newPatient = await Patient.create({
    user_id: newUser.user_id,
    date_of_birth,
    gender,
    address,
    phone_number,
    insurance_number,
    id_number,
    is_verified: false,
  });
  return { message: "Patient registered successfully", patient: newPatient };
}