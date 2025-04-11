import db from "../models/index.js";
import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import cloudinary from "../config/cloudinary.js";
import jwt from "jsonwebtoken";
import axios from "axios";
const { User, Admin } = db;
export const registerAdmin = async ({ username, email, password }) => {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) throw new BadRequestError("Email is already registered");

  // const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    username,
    email,
    // password: hashedPassword,
    password,
    role: "admin",
  });

  const newAdmin = await Admin.create({
    user_id: newUser.user_id,
  });

  return {
    message: "Admin registered successfully",
    admin: {
      user_id: newUser.user_id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
    },
  };
};
export const loginAdmin = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email, role: "admin" },
    include: { model: Admin, as: "admin" },
  });

  if (!user) throw new BadRequestError("Email hoặc mật khẩu không chính xác");

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword)
    throw new BadRequestError("Email hoặc mật khẩu không chính xác");

  const token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    message: "Đăng nhập thành công",
    token,
    admin: {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  };
};
export const addDoctor = async (doctorData) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      username,
      email,
      password,
      avatar,
      specialization_id,
      degree,
      experience_years,
      description,
    } = doctorData;

    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      throw new BadRequestError("Email is already registered");
    }

    let avatarUrl = null;
    if (avatar) {
      const uploadResult = await cloudinary.uploader.upload(avatar, {
        folder: "avatars",
        use_filename: true,
        unique_filename: false,
      });

      avatarUrl = uploadResult.secure_url;
    }

    const newUser = await User.create(
      {
        username,
        email,
        password,
        avatar:
          avatarUrl ||
          "https://static.vecteezy.com/system/resources/previews/020/911/740/non_2x/user-profile-icon-profile-avatar-user-icon-male-icon-face-icon-profile-icon-free-png.png",
        role: "doctor",
      },
      { transaction }
    );

    const user_id = newUser.user_id;

    const newDoctor = await Doctor.create(
      {
        user_id,
        specialization_id,
        degree,
        experience_years,
        description,
      },
      { transaction }
    );

    const doctor_id = newDoctor.doctor_id;

    await Schedule.create(
      {
        doctor_id,
      },
      { transaction }
    );

    await transaction.commit();
    return { message: "Success" };
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};
export const updateDoctorProfile = async (user_id, updateData) => {
  const transaction = await db.sequelize.transaction();
  try {
    const user = await User.findByPk(user_id, {
      attributes: { exclude: ["password"] },
      include: [{ model: Doctor, as: "doctor" }],
      transaction,
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { doctor } = user;
    if (!doctor) {
      throw new NotFoundError("Doctor not found");
    }

    const userFields = ["username", "email"];
    userFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        user[field] = updateData[field];
      }
    });

    if (updateData.avatar) {
      const uploadResult = await cloudinary.uploader.upload(updateData.avatar, {
        folder: "avatars",
        use_filename: true,
        unique_filename: false,
      });
      user.avatar = uploadResult.secure_url;
    }

    const doctorFields = [
      "degree",
      "experience_years",
      "description",
      "specialization_id",
    ];
    doctorFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        doctor[field] = updateData[field];
      }
    });

    await user.save({ transaction });
    await doctor.save({ transaction });

    await transaction.commit();
    return { message: "Success" };
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};
export const deleteDoctor = async (user_id) => {
  const transaction = await db.sequelize.transaction();
  try {
    const user = await User.findByPk(user_id, {
      include: [{ model: Doctor, as: "doctor" }],
      transaction,
    });

    if (!user || !user.doctor) {
      throw new NotFoundError("Doctor not found");
    }

    await user.destroy({ transaction }); // CASCADE sẽ xóa doctor & schedule liên quan

    await transaction.commit();
    return { message: "Success" };
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};
export const getDoctorProfile = async (user_id) => {
  try {
    const user = await User.findByPk(user_id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Doctor,
          as: "doctor",
          include: [
            { model: Specialization, as: "specialization" },
            { model: Schedule, as: "schedule" },
          ],
        },
      ],
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { doctor } = user;
    if (!doctor) {
      throw new NotFoundError("Doctor not found");
    }

    return {
      message: "Success",
      user,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
export const getAllDoctors = async () => {
  try {
    const doctors = await Doctor.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: { exclude: ["password"] },
        },
        {
          model: Specialization,
          as: "specialization",
        },
      ],
    });

    if (doctors.length === 0) {
      throw new NotFoundError("No doctors found");
    }

    return {
      message: "Success",
      doctors,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
export const getAllSpecializations = async () => {
  try {
    const specializations = await Specialization.findAll();
    if (specializations.length === 0) {
      throw new NotFoundError("No specializations found");
    }

    return { message: "Success", specializations };
  } catch (error) {
    throw new Error(error.message);
  }
};
export const createSpecialization = async (name, fees, imageFile) => {
  const transaction = await db.sequelize.transaction();
  try {
    const existingSpecialization = await Specialization.findOne({
      where: { name },
      transaction,
    });
    if (existingSpecialization) {
      throw new BadRequestError("Specialization already exists");
    }

    let imageUrl = null;
    if (imageFile) {
      const uploadResult = await cloudinary.uploader.upload(imageFile, {
        folder: "specializations",
        use_filename: true,
        unique_filename: false,
      });

      imageUrl = uploadResult.secure_url;
    }

    await Specialization.create(
      {
        name,
        fees,
        image:
          imageUrl ||
          "https://cdn1.youmed.vn/tin-tuc/wp-content/uploads/2023/05/yhocduphong.png",
      },
      { transaction }
    );

    await transaction.commit();
    return { message: "Success" };
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};
export const updateSpecialization = async (specialization_id, updateData) => {
  const transaction = await db.sequelize.transaction();
  try {
    const specialization = await Specialization.findByPk(specialization_id, {
      transaction,
    });
    if (!specialization) {
      throw new NotFoundError("Specialization not found");
    }

    const data = {};

    if (updateData.name) {
      const existingSpecialization = await Specialization.findOne({
        where: { name: updateData.name },
        transaction,
      });

      if (existingSpecialization) {
        throw new BadRequestError("Specialization name already exists.");
      }

      data.name = updateData.name;
    }

    if (updateData.fees) {
      data.fees = updateData.fees;
    }

    if (updateData.image) {
      const uploadResult = await cloudinary.uploader.upload(updateData.image, {
        folder: "specializations",
        use_filename: true,
        unique_filename: false,
      });

      let imageUrl = uploadResult.secure_url;

      data.image = imageUrl;
    }

    await specialization.update({ ...data }, { transaction });

    await transaction.commit();
    return { message: "Success" };
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};

export const deleteSpecialization = async (specialization_id) => {
  const transaction = await db.sequelize.transaction();
  try {
    const specialization = await Specialization.findByPk(specialization_id, {
      transaction,
    });
    if (!specialization) {
      throw new NotFoundError("Specialization not found");
    }

    await specialization.destroy({ transaction });
    await transaction.commit();
    return { message: "Success" };
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};

export const updateDoctorProfileWithAxios = async (user_id, updateData) => {
  try {
    const response = await axios.post(`${url1}/doctor/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    return { message: "Success" };
  } catch (error) {
    throw new Error(error.message);
  }
};