import { findUserByEmail, createUser } from "../services/userService.js";
import { validationResult } from "express-validator";

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
