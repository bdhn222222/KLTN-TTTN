import db from "../models/index.js";
import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import cloudinary from "../config/cloudinary.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import { Op, fn, col, literal } from "sequelize";
import medicalRecords from "../models/medicalRecords.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js"; // Sử dụng phần mở rộng .js
import timezone from "dayjs/plugin/timezone.js"; // Sử dụng phần mở rộng .js

import familyMember from "../models/familyMember.js";

dayjs.extend(timezone);
dayjs.extend(utc);
const format = (datetime) => {
  return dayjs(datetime).tz("Asia/Ho_Chi_Minh").format("DD-MM-YYYY HH:mm:ss");
};

const {
  User,
  Admin,
  Patient,
  Doctor,
  PrescriptionMedicine,
  Medicine,
  Appointment,
  FamilyMember,
  Specialization,
  Schedule,
  Prescription,
  MedicalRecord,
  Payment,
} = db;
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
// export const updateDoctorProfile = async (user_id, updateData) => {
//   const transaction = await db.sequelize.transaction();
//   try {
//     const user = await User.findByPk(user_id, {
//       attributes: { exclude: ["password"] },
//       include: [{ model: Doctor, as: "doctor" }],
//       transaction,
//     });

//     if (!user) {
//       throw new NotFoundError("User not found");
//     }

//     const { doctor } = user;
//     if (!doctor) {
//       throw new NotFoundError("Doctor not found");
//     }

//     const userFields = ["username", "email"];
//     userFields.forEach((field) => {
//       if (updateData[field] !== undefined) {
//         user[field] = updateData[field];
//       }
//     });

//     if (updateData.avatar) {
//       const uploadResult = await cloudinary.uploader.upload(updateData.avatar, {
//         folder: "avatars",
//         use_filename: true,
//         unique_filename: false,
//       });
//       user.avatar = uploadResult.secure_url;
//     }

//     const doctorFields = [
//       "degree",
//       "experience_years",
//       "description",
//       "specialization_id",
//     ];
//     doctorFields.forEach((field) => {
//       if (updateData[field] !== undefined) {
//         doctor[field] = updateData[field];
//       }
//     });

//     await user.save({ transaction });
//     await doctor.save({ transaction });

//     await transaction.commit();
//     return { message: "Success" };
//   } catch (error) {
//     await transaction.rollback();
//     throw new Error(error.message);
//   }
// };
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

export const getAllSpecializations = async ({
  page = 1,
  limit = 20,
  search = "",
} = {}) => {
  // 1. Tính toán offset
  const offset = (Number(page) - 1) * Number(limit);

  // 2. Build điều kiện tìm kiếm
  const where = {};
  if (search.trim()) {
    where.name = { [Op.like]: `%${search.trim()}%` };
  }

  // 3. Query với pagination và đếm tổng
  const { count, rows } = await Specialization.findAndCountAll({
    where,
    order: [["name", "ASC"]],
    offset,
    limit: Number(limit),
    attributes: ["specialization_id", "name", "fees", "image"],
  });

  if (rows.length === 0) {
    throw new NotFoundError("Không tìm thấy chuyên khoa nào");
  }

  // 4. Format dữ liệu
  const data = rows.map((sp) => ({
    specialization_id: sp.specialization_id,
    name: sp.name,
    fees: `${sp.fees.toLocaleString("vi-VN")} VNĐ`,
    image: sp.image,
  }));

  // 5. Trả về kèm pagination
  return {
    success: true,
    message: "Lấy danh sách chuyên khoa thành công",
    data,
    pagination: {
      total: count,
      per_page: Number(limit),
      current_page: Number(page),
      total_pages: Math.ceil(count / Number(limit)),
    },
  };
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
  const t = await db.sequelize.transaction();
  try {
    // 1. Tìm chuyên khoa
    const specialization = await Specialization.findByPk(specialization_id, {
      transaction: t,
    });
    if (!specialization) {
      throw new NotFoundError(
        `Chuyên khoa #${specialization_id} không tồn tại`
      );
    }

    const data = {};

    // 2. Đổi tên (nếu có)
    if (updateData.name) {
      const exists = await Specialization.findOne({
        where: { name: updateData.name },
        transaction: t,
      });
      if (exists && exists.specialization_id !== specialization_id) {
        throw new BadRequestError("Tên chuyên khoa đã tồn tại");
      }
      data.name = updateData.name;
    }

    // 3. Cập nhật phí (nếu có)
    if (updateData.fees != null) {
      data.fees = updateData.fees;
    }

    // 4. Upload ảnh mới (nếu có)
    if (updateData.image) {
      const uploadResult = await cloudinary.uploader.upload(updateData.image, {
        folder: "specializations",
        use_filename: true,
        unique_filename: false,
      });
      data.image = uploadResult.secure_url;
    }

    // 5. Áp dụng cập nhật
    await specialization.update(data, { transaction: t });
    await t.commit();

    return {
      success: true,
      message: "Cập nhật chuyên khoa thành công",
      data: {
        specialization_id: specialization.specialization_id,
        name: specialization.name,
        fees: `${specialization.fees.toLocaleString("vi-VN")} VNĐ`,
        image: specialization.image,
        description: specialization.description,
      },
    };
  } catch (err) {
    await t.rollback();
    // Nếu là lỗi do validation, ném thẳng để controller trả về đúng HTTP code
    if (err instanceof BadRequestError || err instanceof NotFoundError) {
      throw err;
    }
    // Các lỗi khác thì gói chung
    throw new Error(err.message);
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

export const getAllAppointments = async () => {
  const t = await db.sequelize.transaction();
  try {
    const appointments = await Appointment.findAll({
      order: [["appointment_datetime", "DESC"]],
      include: [
        // FamilyMember → Patient → User
        {
          model: FamilyMember,
          as: "FamilyMember",
          include: [
            {
              model: Patient,
              as: "patient",
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["user_id", "username", "email", "avatar"],
                },
              ],
            },
          ],
        },
        // Doctor → User + Specialization
        {
          model: Doctor,
          as: "Doctor",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["user_id", "username", "email", "avatar"],
            },
            {
              model: Specialization,
              as: "Specialization",
              attributes: ["specialization_id", "name", "fees"],
            },
          ],
        },
        // MedicalRecord
        {
          model: MedicalRecord,
          as: "MedicalRecord",
        },
        // Prescription → Medicines
        {
          model: Prescription,
          as: "Prescription",
          include: [
            {
              model: PrescriptionMedicine,
              as: "prescriptionMedicines",
              include: [
                {
                  model: Medicine,
                  as: "Medicine",
                },
              ],
            },
          ],
        },
        // Payments (lấy payment gần nhất)
        {
          model: Payment,
          as: "Payments",
          limit: 1,
          order: [["createdAt", "DESC"]],
        },
      ],
      transaction: t,
    });

    await t.commit();

    if (!appointments.length) {
      throw new NotFoundError("Chưa có cuộc hẹn nào");
    }

    return {
      success: true,
      message: "Lấy danh sách cuộc hẹn thành công",
      data: appointments,
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

export const getSpecializationDetails = async ({ specialization_id }) => {
  // 1. Lấy chuyên khoa và kèm danh sách bác sĩ
  const specialization = await Specialization.findByPk(specialization_id, {
    attributes: ["specialization_id", "name", "fees", "image"],
    include: [
      {
        model: Doctor,
        as: "doctors", // phải khớp alias trong associate
        attributes: ["doctor_id", "degree", "experience_years", "rating"],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["user_id", "username", "email", "avatar"],
          },
        ],
      },
    ],
    order: [
      [{ model: Doctor, as: "doctors" }, "rating", "DESC"], // cũng phải dùng alias 'doctors'
    ],
  });

  if (!specialization) {
    throw new NotFoundError(`Chuyên khoa #${specialization_id} không tồn tại`);
  }

  // 2. Format fees & doctors
  const data = {
    specialization_id: specialization.specialization_id,
    name: specialization.name,
    fees: `${specialization.fees.toLocaleString("vi-VN")} VNĐ`,
    image: specialization.image,
    description: specialization.description,
    doctors: specialization.doctors.map((doc) => ({
      doctor_id: doc.doctor_id,
      name: doc.user?.username,
      email: doc.user?.email,
      avatar: doc.user?.avatar,
      degree: doc.degree,
      experience_years: doc.experience_years,
      rating: doc.rating,
    })),
  };

  return {
    success: true,
    message: "Lấy chi tiết chuyên khoa thành công",
    data,
  };
};
export const getAllPatients = async () => {
  const patients = await db.Patient.findAll({
    attributes: [
      "patient_id",
      //"username", // hoặc username tuỳ model của bạn
      "date_of_birth",
      "gender",
      "phone_number",
      [
        fn("MAX", col("familyMembers.appointments.appointment_datetime")),
        "lastAppointment",
      ],
    ],
    include: [
      {
        model: FamilyMember,
        as: "familyMembers",
        attributes: [],
        include: [
          {
            model: Appointment,
            as: "appointments",
            attributes: [],
          },
        ],
      },
      {
        model: User,
        as: "user",
        attributes: ["username", "email"],
      },
    ],
    group: ["Patient.patient_id"],
    order: [[literal("lastAppointment"), "DESC"]],
    // nếu cần pagination, add limit/offset ở đây
  });

  if (patients.length === 0) {
    throw new NotFoundError("No patients found");
  }

  return {
    message: "Success",
    data: patients.map((p) => ({
      patient_id: p.patient_id,
      full_name: p.user.username,
      date_of_birth: p.date_of_birth,
      gender: p.gender,
      phone_number: p.phone_number,
      lastAppointment: p.get("lastAppointment"), // truy xuất cột ảo
    })),
  };
};

export const getPatientAppointments = async (patient_id) => {
  // 1. Tìm Patient & include familyMembers → appointments → nested includes
  const patient = await db.Patient.findOne({
    where: { patient_id },
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["user_id", "username", "email", "avatar"],
      },
      {
        model: db.FamilyMember,
        as: "familyMembers",
        include: [
          {
            model: db.Appointment,
            as: "appointments",
            include: [
              {
                model: db.Doctor,
                as: "Doctor",
                include: [
                  {
                    model: db.User,
                    as: "user",
                    attributes: ["username", "email", "avatar"],
                  },
                  {
                    model: db.Specialization,
                    as: "Specialization",
                    attributes: ["name", "fees"],
                  },
                ],
              },
              { model: db.FamilyMember, as: "FamilyMember" },
              { model: db.MedicalRecord, as: "MedicalRecord" },
              {
                model: db.Prescription,
                as: "Prescription",
                include: [
                  {
                    model: db.PrescriptionMedicine,
                    as: "prescriptionMedicines",
                    include: [{ model: db.Medicine, as: "Medicine" }],
                  },
                ],
              },
              { model: db.Payment, as: "Payments" },
            ],
            order: [["appointment_datetime", "DESC"]],
          },
        ],
      },
    ],
  });

  if (!patient) {
    throw new NotFoundError("Không tìm thấy bệnh nhân");
  }

  // 2. Format lại đôi chút (nếu cần)
  const result = {
    patient_id: patient.patient_id,
    username: patient.user.username,
    email: patient.user.email,
    avatar: patient.user.avatar,
    familyMembers: patient.familyMembers.map((fm) => ({
      family_member_id: fm.family_member_id,
      name: fm.username,
      relationship: fm.relationship,
      appointments: fm.appointments.map((app) => ({
        appointment_id: app.appointment_id,
        datetime: app.appointment_datetime,
        status: app.status,
        fees: app.fees,
        doctor: app.Doctor
          ? {
              doctor_id: app.Doctor.doctor_id,
              name: app.Doctor.user.username,
              email: app.Doctor.user.email,
              specialization: app.Doctor.Specialization.name,
              fees: app.Doctor.Specialization.fees,
            }
          : null,
        familyMember: app.FamilyMember
          ? {
              family_member_id: app.FamilyMember.family_member_id,
              name: app.FamilyMember.username,
              relationship: app.FamilyMember.relationship,
            }
          : null,
        medicalRecord: app.MedicalRecord
          ? {
              record_id: app.MedicalRecord.record_id,
              diagnosis: app.MedicalRecord.diagnosis,
              treatment: app.MedicalRecord.treatment,
              notes: app.MedicalRecord.notes,
            }
          : null,
        prescription: app.Prescription
          ? {
              prescription_id: app.Prescription.prescription_id,
              status: app.Prescription.status,
              //use_hospital_pharmacy: app.Prescription.use_hospital_pharmacy,
              medicines: app.Prescription.prescriptionMedicines.map((pm) => ({
                prescription_medicine_id: pm.prescription_medicine_id,
                medicine: {
                  medicine_id: pm.Medicine.medicine_id,
                  name: pm.Medicine.name,
                  unit: pm.Medicine.unit,
                  price: pm.Medicine.price,
                },
                prescribed: {
                  quantity: pm.quantity,
                  dosage: pm.dosage,
                  frequency: pm.frequency,
                  duration: pm.duration,
                  instructions: pm.instructions,
                  total_price: pm.total_price,
                },
                dispensed: {
                  actual_quantity: pm.actual_quantity,
                },
              })),
            }
          : null,
        payment: app.Payments
          ? {
              payment_id: app.Payments.payment_id,
              amount: app.Payments.amount,
              payment_method: app.Payments.payment_method,
              status: app.Payments.status,
              createdAt: app.Payments.createdAt,
            }
          : null,
      })),
    })),
  };

  return { success: true, message: "Lấy lịch hẹn thành công", data: result };
};
export const getAllMedicines = async ({
  search = "",
  page = 1,
  limit = 20,
  sortField = "name",
  sortOrder = "ASC",
} = {}) => {
  // parse và validate
  const pageNum = Math.max(1, parseInt(page, 10));
  const perPage = Math.max(1, parseInt(limit, 10));
  const offset = (pageNum - 1) * perPage;
  const order = [
    [sortField, sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC"],
  ];

  // điều kiện search
  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { unit: { [Op.like]: `%${search}%` } },
    ];
  }

  // tổng số
  const total = await db.Medicine.count({ where });

  // query
  const meds = await db.Medicine.findAll({
    where,
    order,
    offset,
    limit: perPage,
  });

  return {
    success: true,
    message: "Lấy danh sách thuốc thành công",
    data: meds,
    pagination: {
      total,
      page: pageNum,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
  };
};

export const updatePaymentStatus = async ({
  payment_id,
  status,
  note = "",
}) => {
  const t = await db.sequelize.transaction();
  try {
    // 1. Tìm bản ghi
    const payment = await db.Payment.findByPk(payment_id, { transaction: t });
    if (!payment) {
      throw new NotFoundError("Không tìm thấy thông tin thanh toán");
    } // 2. Validate

    const validStatuses = ["pending", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError("Cuộc hẹn này đã được thanh toán");
    } // 3. Cập nhật

    await payment.update(
      { status, note: note || payment.note },
      { transaction: t }
    ); // 4. Commit chỉ khi mọi thứ OK

    await t.commit(); // 5. Trả về dữ liệu

    return {
      success: true,
      message: "Cập nhật trạng thái thanh toán thành công",
      data: {
        payment_id: payment.payment_id,
        appointment_id: payment.appointment_id,
        amount: payment.amount
          ? `${payment.amount.toLocaleString("vi-VN")} VNĐ`
          : null,
        payment_method: payment.payment_method,
        status: payment.status,
        note: payment.note,
        payment_date: dayjs(payment.createdAt)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD HH:mm:ss"),
      },
    };
  } catch (error) {
    // Chỉ rollback nếu transaction vẫn đang mở
    if (!t.finished) {
      await t.rollback();
    }
    throw error;
  }
};

export const getAppointmentDetails = async (appointment_id) => {
  const appt = await db.Appointment.findOne({
    where: { appointment_id },
    include: [
      {
        model: db.Doctor,
        as: "Doctor",
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["username", "email", "avatar"],
          },
          {
            model: db.Specialization,
            as: "Specialization",
            attributes: ["name", "fees"],
          },
        ],
      },
      {
        model: db.FamilyMember,
        as: "FamilyMember",
        include: [
          {
            model: db.Patient,
            as: "patient",
            include: [
              { model: db.User, as: "user", attributes: ["username", "email"] },
            ],
          },
        ],
      },
      { model: db.MedicalRecord, as: "MedicalRecord" },
      {
        model: db.Prescription,
        as: "Prescription",
        attributes: { exclude: ["use_hospital_pharmacy"] },
        include: [
          {
            model: db.PrescriptionMedicine,
            as: "prescriptionMedicines",
            include: [{ model: db.Medicine, as: "Medicine" }],
          },
        ],
      },
      { model: db.Payment, as: "Payments" },
    ],
  });

  if (!appt) {
    throw new NotFoundError(`Không tìm thấy cuộc hẹn #${appointment_id}`);
  }

  return {
    appointment_id: appt.appointment_id,
    appointment_datetime: format(appt.appointment_datetime),
    status: appt.status,
    fees: appt.fees,

    doctor: appt.Doctor && {
      doctor_id: appt.Doctor.doctor_id,
      username: appt.Doctor.user.username,
      email: appt.Doctor.user.email,
      avatar: appt.Doctor.user.avatar,
      specialization: appt.Doctor.Specialization.name,
      fees: appt.Doctor.Specialization.fees
        ? `${appt.Doctor.Specialization.fees.toLocaleString("vi-VN")} VNĐ`
        : null,
    },

    family_member: appt.FamilyMember && {
      family_member_id: appt.FamilyMember.family_member_id,
      username: appt.FamilyMember.username,
      email: appt.FamilyMember.email,
      phone_number: appt.FamilyMember.phone_number,
      gender: appt.FamilyMember.gender,
      date_of_birth: dayjs(appt.FamilyMember.date_of_birth).format(
        "DD/MM/YYYY"
      ),
      relationship: appt.FamilyMember.relationship,
      main_patient: appt.FamilyMember.patient && {
        patient_id: appt.FamilyMember.patient.patient_id,
        username: appt.FamilyMember.patient.user.username,
        email: appt.FamilyMember.patient.user.email,
      },
    },

    medical_record: appt.MedicalRecord && {
      record_id: appt.MedicalRecord.record_id,
      diagnosis: appt.MedicalRecord.diagnosis,
      treatment: appt.MedicalRecord.treatment,
      notes: appt.MedicalRecord.notes,
      createdAt: format(appt.MedicalRecord.createdAt),
      updatedAt: format(appt.MedicalRecord.updatedAt),
    },

    prescription: appt.Prescription && {
      prescription_id: appt.Prescription.prescription_id,
      status: appt.Prescription.status,
      pdf_url: appt.Prescription.pdf_url,
      createdAt: format(appt.Prescription.createdAt),
      updatedAt: format(appt.Prescription.updatedAt),
      medicines: appt.Prescription.prescriptionMedicines.map((pm) => ({
        prescription_medicine_id: pm.prescription_medicine_id,
        quantity: pm.quantity,
        actual_quantity: pm.actual_quantity,
        dosage: pm.dosage,
        frequency: pm.frequency,
        duration: pm.duration,
        instructions: pm.instructions,
        unit_price: pm.unit_price,
        total_price: pm.total_price,
        medicine: {
          medicine_id: pm.Medicine.medicine_id,
          name: pm.Medicine.name,
          unit: pm.Medicine.unit,
          price: pm.Medicine.price,
        },
      })),
    },

    payment: appt.Payments && {
      payment_id: appt.Payments.payment_id,
      amount: appt.Payments.amount
        ? `${appt.Payments.amount.toLocaleString("vi-VN")} VNĐ`
        : null,
      payment_method: appt.Payments.payment_method,
      status: appt.Payments.status,
      createdAt: format(appt.Payments.createdAt),
    },
  };
};
export const getDoctorDetails = async ({ doctor_id }) => {
  const doctor = await Doctor.findByPk(doctor_id, {
    attributes: [
      "doctor_id",
      "degree",
      "experience_years",
      "rating",
      "description",
    ],
    include: [
      {
        model: User,
        as: "user",
        attributes: ["user_id", "username", "email", "avatar"],
      },
      {
        model: Specialization,
        as: "Specialization",
        attributes: ["specialization_id", "name", "fees"],
      },
      {
        model: Schedule,
        as: "Schedule",
        // ví dụ: các cột monday, tuesday, ... boolean
      },
    ],
  });

  if (!doctor) {
    throw new NotFoundError(`Bác sĩ #${doctor_id} không tồn tại`);
  }

  return {
    success: true,
    message: "Lấy chi tiết bác sĩ thành công",
    data: {
      doctor_id: doctor.doctor_id,
      username: doctor.user.username,
      email: doctor.user.email,
      avatar: doctor.user.avatar,
      degree: doctor.degree,
      experience_years: doctor.experience_years,
      rating: doctor.rating,
      description: doctor.description,
      specialization: {
        id: doctor.Specialization.specialization_id,
        name: doctor.Specialization.name,
        fees: `${doctor.Specialization.fees.toLocaleString("vi-VN")} VNĐ`,
      },
      schedule: doctor.Schedule, // trả nguyên object Schedule
    },
  };
};
