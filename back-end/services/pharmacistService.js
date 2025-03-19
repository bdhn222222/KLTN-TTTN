import bcrypt from 'bcryptjs';
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import Admin from "../models/admins.js";
export const registerPharmacist = async ({ username, email, password, license_number }) => {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new BadRequestError("Email is already registered");
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: "pharmacist",
    });
  
    const newPharmacist = await Pharmacist.create({
      user_id: newUser.user_id,
      license_number,
    });
  
    return { message: "Pharmacist registered successfully", pharmacist: newPharmacist };
  };