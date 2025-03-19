import bcrypt from 'bcryptjs';
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import {Pharmacist} from "../models/admins.js";
import User from '../models/user.js';
const { User, Pharmacist } = db;
export const registerP = async ( {username, email, password, license_number}) =>{
  const existingPharmacist = await User.findOne({ where: { email } });
  if(existingPharmacist) throw new BadRequestError("Email đã được đăng ký");
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = await User.create({ username, email, password: hashedPassword });
  const newPharmacist = await Pharmacist.create({
    user_id: newUser.id,
    license_number
  })
  return { message: "Đăng ký account dược sĩ thành công", pharmacist: newPharmacist };
}