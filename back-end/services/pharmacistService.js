import bcrypt from 'bcryptjs';
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import {Pharmacist} from "../models/admins.js";
import User from '../models/user.js';
const { User, Pharmacist } = db;
export const registerPharmacist = async ( {username, email, password, license_number}) =>{
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

export const loginPharmacist = async ({ email, password }) => {
  const user = await User.findOne({ where: { email, role: "pharmacist" }, include: { model: Pharmacist, as: "pharmacist" } });

  if (!user) {
    throw new NotFoundError("Dược sĩ không tồn tại hoặc email không đúng");
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
    pharmacist: {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role,
      license_number: user.pharmacist.license_number,
    },
  };
};