import { findUserByEmail, createUser, findUserById, updateUser } from "../services/userService.js";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";  
import bcrypt from "bcrypt";  
import config from "../config/config.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

export const registerUser = async (req, res) => {
  // Kiểm tra dữ liệu đầu vào
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role } = req.body;

  try {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    // Tạo người dùng mới
    const newUser = await createUser({ name, email, password, role });

    return res.status(201).json({ 
      message: "Đăng ký thành công", 
      user: {
        id: newUser.id,  // Đổi `user_id` thành `id`
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
export const loginUser = async(req, res)=>{
  const {email, password} = req.body;
  try{
    const user = await findUserByEmail(email)
    if(!user){
      return res.status(400).json({message: "Email không tồn tại"})
    }
    const isPasswordValid = await bcrypt.compare(password, user.password); // so sánh password khi đã được mã hóa
    if(!isPasswordValid){
      return res.status(400).json({message: "Mật khẩu không đúng!"})
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
}
export const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Thông tin người dùng",
      user: req.user, // Thông tin user đã được middleware thêm vào
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};


export const updateUserProfile = async (req, res) => {
  // Kiểm tra dữ liệu đầu vào
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });

  const { name, email, password, avatar } = req.body;
  const userId = req.user.id; // Lấy ID từ token đã xác thực

  try {
    // Kiểm tra user có tồn tại không
    const user = await findUserById(userId);
    if (!user) {
      return res.status(401).json({ message: "Người dùng không tồn tại" }); 
    }

    // Cập nhật thông tin người dùng
    const updatedData = {}; 
if (name) updatedData.name = name;
if (email) updatedData.email = email;
if (avatar) updatedData.avatar = avatar;
if (password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  updatedData.password = hashedPassword;
}

await updateUser(userId, updatedData);


    return res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: { 
        id: user.id, 
        name: updatedData.name || user.name, 
        email: updatedData.email || user.email, 
        avatar: updatedData.avatar || user.avatar 
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
}
};

export const changePassword = async (req, res) => {
  // Kiểm tra dữ liệu đầu vào
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id; // ✅ Lấy ID từ token đã xác thực

  try {
    // 1️⃣ Tìm người dùng trong database
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // 2️⃣ Kiểm tra mật khẩu cũ có đúng không
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    // 3️⃣ Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4️⃣ Cập nhật mật khẩu mới
    await updateUser(userId, { password: hashedPassword });

    return res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
export const forgotPassword = async (req, res) => {
  // Kiểm tra dữ liệu đầu vào
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email } = req.body;
  try {
    // 1️⃣ Kiểm tra email có tồn tại không
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại trong hệ thống" });
    }
  const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Hết hạn sau 10 phút

    await updateUser(user.id, { otp_code: otp, otp_expiry: otpExpiry });
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Mã OTP đặt lại mật khẩu",
      text: `Mã OTP của bạn là: ${otp}. OTP này sẽ hết hạn sau 10 phút.`,
    };
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "OTP đã được gửi đến email của bạn" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};