import db from "../models/index.js";

import { Readable } from "stream";
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
import NotFoundError from "../errors/not_found.js";
import doctorDayOffs from "../models/doctor-day-offs.js";
import {
  sendEmailAcceptAppointment,
  sendEmailCancelAppointment,
} from "../utils/gmail.js";

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
  DoctorDayOff,
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

    // 1. Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      throw new BadRequestError("Email is already registered");
    }

    // 2. Upload avatar nếu có
    let avatarUrl = avatar;
    if (avatar) {
      const uploadResult = await cloudinary.uploader.upload(avatar, {
        folder: "avatars",
        use_filename: true,
        unique_filename: false,
      });
      avatarUrl = uploadResult.secure_url;
    }

    // 3. Tạo bản ghi User với role = doctor
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

    // 4. Tạo profile Doctor
    const newDoctor = await Doctor.create(
      {
        user_id: newUser.user_id,
        specialization_id,
        degree,
        experience_years,
        description,
      },
      { transaction }
    );

    // 5. Khởi tạo Schedule rỗng cho bác sĩ mới
    // await Schedule.create({ doctor_id: newDoctor.doctor_id }, { transaction });

    await transaction.commit();
    return { message: "Doctor created successfully" };
  } catch (error) {
    await transaction.rollback();
    throw error;
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
// export const getDoctorDetails = async (doctor_id) => {
//   try {
//     const doctor = await Doctor.findByPk(doctor_id, {
//       attributes: { exclude: ["password"] },
//       include: [
//         {
//           model: Doctor,
//           as: "doctor",
//           include: [
//             { model: Specialization, as: "specialization" },
//             { model: Schedule, as: "schedule" },
//           ],
//         },
//       ],
//     });

//     if (!user) {
//       throw new NotFoundError("User not found");
//     }

//     const { doctor } = user;
//     if (!doctor) {
//       throw new NotFoundError("Doctor not found");
//     }

//     return {
//       message: "Success",
//       user,
//     };
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };
export const getAllDoctors = async () => {
  const { Doctor, User, Specialization } = db;

  const doctors = await Doctor.findAll({
    include: [
      {
        model: User,
        as: "user",
        attributes: { exclude: ["password"] },
      },
      {
        model: Specialization,
        as: "Specialization",
        attributes: ["specialization_id", "name", "fees"],
      },
    ],
    order: [["doctor_id", "ASC"]],
  });

  if (!doctors || doctors.length === 0) {
    throw new NotFoundError("No doctors found");
  }

  return doctors;
};

export const getAllSpecializations = async ({
  page = 1,
  limit = 20,
  search = "",
} = {}) => {
  const offset = (Number(page) - 1) * Number(limit);

  const where = {};
  if (search.trim()) {
    where.name = { [Op.like]: `%${search.trim()}%` };
  }

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

  // 🔄 Fetch doctor count cho từng chuyên khoa
  const data = await Promise.all(
    rows.map(async (sp) => {
      const doctorCount = await db.Doctor.count({
        where: { specialization_id: sp.specialization_id },
      });

      return {
        specialization_id: sp.specialization_id,
        name: sp.name,
        fees: `${sp.fees.toLocaleString("vi-VN")} VNĐ`,
        image: sp.image,
        doctor_count: doctorCount,
      };
    })
  );

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
export const createSpecialization = async (name, fees, file) => {
  const transaction = await db.sequelize.transaction();
  try {
    const existingSpecialization = await Specialization.findOne({
      where: { name },
      transaction,
    });
    if (existingSpecialization) {
      throw new BadRequestError("Tên chuyên khoa đã tồn tại");
    }

    let imageUrl = null;
    if (file && file.buffer) {
      const uploadStream = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "specializations",
              use_filename: true,
              unique_filename: false,
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          Readable.from(file.buffer).pipe(stream);
        });

      const result = await uploadStream();
      imageUrl = result.secure_url;
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
    throw error;
  }
};

export const updateSpecialization = async (
  specialization_id,
  updateData,
  file
) => {
  const t = await db.sequelize.transaction();
  try {
    // Fetch the specialization with doctors for doctor_count
    const specialization = await Specialization.findByPk(specialization_id, {
      transaction: t,
      include: [{ model: Doctor, as: "doctors", attributes: ["doctor_id"] }],
    });

    if (!specialization) {
      throw new NotFoundError(
        `Chuyên khoa #${specialization_id} không tồn tại`
      );
    }

    const data = {};

    // Handle name update
    if (updateData.name) {
      const exists = await Specialization.findOne({
        where: {
          name: updateData.name,
          specialization_id: { [Op.ne]: specialization_id },
        },
        transaction: t,
      });

      if (exists) {
        throw new BadRequestError("Tên chuyên khoa đã tồn tại");
      }
      data.name = updateData.name;
    }

    // Handle fees update
    if (updateData.fees != null) {
      data.fees = updateData.fees;
    }

    // Handle image update (from multer memory buffer)
    if (file && file.buffer) {
      const uploadStream = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "specializations",
              use_filename: true,
              unique_filename: false,
              transformation: [
                { width: 400, height: 300, crop: "fill", quality: "auto:good" },
                { fetch_format: "auto" },
              ],
              format: "webp",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );

          Readable.from(file.buffer).pipe(stream);
        });

      const result = await uploadStream();
      data.image = result.secure_url;
    }

    await specialization.update(data, { transaction: t });
    await t.commit();

    // Fetch the updated specialization to get the latest data
    const updatedSpecialization = await Specialization.findByPk(
      specialization_id,
      {
        include: [{ model: Doctor, as: "doctors", attributes: ["doctor_id"] }],
      }
    );

    return {
      success: true,
      message: "Cập nhật chuyên khoa thành công",
      data: {
        specialization_id: updatedSpecialization.specialization_id,
        name: updatedSpecialization.name,
        fees: `${updatedSpecialization.fees.toLocaleString("vi-VN")} VNĐ`,
        image: updatedSpecialization.image,
        doctor_count: updatedSpecialization.doctors.length,
      },
    };
  } catch (err) {
    await t.rollback();
    console.error("Error in updateSpecialization:", err);
    throw err;
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

export const getAllAppointments = async ({
  appointmentStatus,
  paymentStatus,
}) => {
  // Xây dựng điều kiện cho Appointment
  const whereAppointment = {};
  if (appointmentStatus) {
    whereAppointment.status = appointmentStatus;
  }

  // Xây dựng include cho Payment
  const paymentInclude = {
    model: db.Payment,
    as: "Payments",
    limit: 1,
    order: [["createdAt", "DESC"]],
  };
  if (paymentStatus) {
    paymentInclude.where = { status: paymentStatus }; // = 'pending', 'paid',...
    paymentInclude.required = true;
  }

  const appointments = await db.Appointment.findAll({
    where: whereAppointment,
    order: [["appointment_datetime", "DESC"]],
    include: [
      {
        model: db.FamilyMember,
        as: "FamilyMember",
        include: [
          {
            model: db.Patient,
            as: "patient",
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["user_id", "username", "email", "avatar"],
              },
            ],
          },
        ],
      },
      {
        model: db.Doctor,
        as: "Doctor",
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["user_id", "username", "email", "avatar"],
          },
          {
            model: db.Specialization,
            as: "Specialization",
            attributes: ["specialization_id", "name", "fees"],
          },
        ],
      },
      {
        model: db.MedicalRecord,
        as: "MedicalRecord",
      },
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
      paymentInclude,
    ],
  });

  if (!appointments.length) {
    throw new NotFoundError("Chưa có cuộc hẹn nào khớp điều kiện");
  }

  return {
    success: true,
    message: "Lấy danh sách cuộc hẹn thành công",
    data: appointments,
  };
};

export const getSpecializationDetails = async ({ specialization_id }) => {
  const specialization = await Specialization.findByPk(specialization_id, {
    attributes: ["specialization_id", "name", "fees", "image"],
    include: [
      {
        model: Doctor,
        as: "doctors",
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
  });

  if (!specialization) {
    throw new NotFoundError(`Chuyên khoa #${specialization_id} không tồn tại`);
  }

  const data = {
    specialization_id: specialization.specialization_id,
    name: specialization.name,
    fees: `${specialization.fees.toLocaleString("vi-VN")} VNĐ`,
    image: specialization.image,
    doctor_count: specialization.doctors.length, // ✅ thêm dòng này
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

    const validCurrentStatuses = ["pending", "cancelled"];
    if (!validCurrentStatuses.includes(payment.status)) {
      throw new BadRequestError("Cuộc hẹn này đã được thanh toán");
    }

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
            attributes: ["name", "specialization_id", "fees"],
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
    specialization_id: appt.Doctor.Specialization.specialization_id,
    reason_cancel: appt.cancel_reason,
    cancel_datetime: format(appt.cancelled_at),
    cancel_by: appt.cancelled_by,

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

    payment:
      appt.Payments && appt.Payments.length > 0
        ? {
            payment_id: appt.Payments[0].payment_id,
            amount: appt.Payments[0].amount
              ? `${appt.Payments[0].amount.toLocaleString("vi-VN")} VNĐ`
              : null,
            payment_method: appt.Payments[0].payment_method,
            status: appt.Payments[0].status,
            createdAt: format(appt.Payments[0].createdAt),
          }
        : null,
  };
};

export const getDoctorDetails = async (doctorId) => {
  const doctor = await Doctor.findOne({
    where: { doctor_id: doctorId },
    include: [
      // Thông tin người dùng
      {
        model: User,
        as: "user",
        attributes: { exclude: ["password"] },
      },

      // Chuyên khoa
      {
        model: Specialization,
        as: "Specialization",
        attributes: ["specialization_id", "name", "fees"],
      },

      // Danh sách cuộc hẹn
      {
        model: Appointment,
        as: "Appointments",
        attributes: ["appointment_id", "appointment_datetime", "status"],
      },

      // Lịch nghỉ của bác sĩ
      {
        model: DoctorDayOff,
        as: "DayOffs",
        attributes: [
          "day_off_id",
          "off_date",
          "off_morning",
          "off_afternoon",
          "reason",
        ],
      },
    ],
  });

  if (!doctor) {
    throw new NotFoundError(`Doctor with id=${doctorId} not found`);
  }

  return doctor;
};
export const getDoctorDayOff = async (doctorId) => {
  const schedule = await Doctor.findOne({
    where: { doctor_id: doctorId },
    include: [
      {
        model: DoctorDayOff,
        as: "DayOffs",
        attributes: [
          "day_off_id",
          "off_date",
          "off_morning",
          "off_afternoon",
          "reason",
        ],
      },
    ],
  });
};
export const updateMedicineDetails = async (medicineId, data) => {
  const medicine = await Medicine.findByPk(medicineId);
  if (!medicine) {
    throw new NotFoundError(`Medicine with id=${medicineId} not found`);
  }

  // Cập nhật các trường được gửi lên
  const updated = await medicine.update(data);
  return updated;
};

export const getMedicineDetails = async (medicineId) => {
  const medicine = await Medicine.findByPk(medicineId);
  if (!medicine) {
    throw new NotFoundError(`Medicine with id=${medicineId} not found`);
  }
  return medicine;
};

export const createMedicine = async (data) => {
  // Bạn có thể thêm check duplicate nếu cần, ví dụ:
  const exists = await Medicine.findOne({ where: { name: data.name } });
  if (exists) {
    throw new BadRequestError(
      `Medicine with name='${data.name}' already exists`
    );
  }

  // Tạo mới
  const created = await Medicine.create(data);
  return created;
};
export const getKpi = async (startDate, endDate) => {
  try {
    // Set default date range to current month if not provided
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month

    // Parse and validate dates
    const start = startDate ? new Date(`${startDate}T00:00:00Z`) : defaultStart;
    const end = endDate ? new Date(`${endDate}T23:59:59Z`) : defaultEnd;
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError("Invalid date format. Use YYYY-MM-DD");
    }

    // Debug log
    console.log("KPI Query Period:", { start, end });

    // Run queries in parallel for better performance
    const [totalAppointments, appointmentRevenue, cancelledCount, newPatients] =
      await Promise.all([
        // 1. Total appointments
        db.Appointment.count({
          where: {
            appointment_datetime: {
              [Op.between]: [start, end],
            },
          },
        }),

        // 2. Total revenue from appointments - include both 'completed' and 'paid' status
        db.Payment.sum("amount", {
          where: {
            createdAt: {
              [Op.between]: [start, end],
            },
            status: {
              [Op.in]: ["paid"],
            },
          },
        }),

        // 3. Cancelled appointments
        db.Appointment.count({
          where: {
            appointment_datetime: {
              [Op.between]: [start, end],
            },
            status: {
              [Op.in]: ["cancelled", "doctor_day_off"],
            },
          },
        }),

        // 4. New patients
        db.FamilyMember.count({
          where: {
            createdAt: {
              [Op.between]: [start, end],
            },
          },
        }),
      ]);

    // Debug log
    console.log("Raw KPI Data:", {
      totalAppointments,
      appointmentRevenue,
      cancelledCount,
      newPatients,
    });

    // Calculate metrics
    const revenue = appointmentRevenue || 0; // Handle null case
    const cancellationRate =
      totalAppointments > 0
        ? parseFloat(((cancelledCount / totalAppointments) * 100).toFixed(1))
        : 0;

    // Calculate trends (% change from previous period)
    const periodLength = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodLength);
    const previousEnd = new Date(start);

    // Debug log
    console.log("Previous Period:", { previousStart, previousEnd });

    const [previousTotalAppointments, previousRevenue, previousNewPatients] =
      await Promise.all([
        db.Appointment.count({
          where: {
            appointment_datetime: {
              [Op.between]: [previousStart, previousEnd],
            },
          },
        }),
        db.Payment.sum("amount", {
          where: {
            createdAt: {
              [Op.between]: [previousStart, previousEnd],
            },
            status: {
              [Op.in]: ["paid"],
            },
          },
        }) || 0,
        db.FamilyMember.count({
          where: {
            createdAt: {
              [Op.between]: [previousStart, previousEnd],
            },
          },
        }),
      ]);

    // Debug log
    console.log("Previous Period Data:", {
      previousTotalAppointments,
      previousRevenue,
      previousNewPatients,
    });

    // Calculate trend percentages
    const calculateTrend = (current, previous) => {
      if (!previous) return 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(1));
    };

    return {
      totalAppointments: {
        value: totalAppointments,
        trend: calculateTrend(totalAppointments, previousTotalAppointments),
      },
      revenue: {
        value: revenue,
        trend: calculateTrend(revenue, previousRevenue),
      },
      cancellationRate: {
        value: cancellationRate,
        isHigher: cancellationRate > 5, // Flag if above threshold
      },
      newPatients: {
        value: newPatients,
        trend: calculateTrend(newPatients, previousNewPatients),
      },
      period: {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      },
    };
  } catch (error) {
    console.error("Error in getKpi:", error);
    throw error;
  }
};
export const getTotalPatients = async ({ filter, date, month, year }) => {
  let start = null,
    end = null,
    periodLabel = "all time";

  // 1. Xác định khoảng thời gian hiện tại
  switch (filter) {
    case "day":
      if (!date) throw new BadRequestError("Missing `date` for filter=day");
      start = new Date(`${date}T00:00:00Z`);
      end = new Date(`${date}T23:59:59Z`);
      periodLabel = date;
      break;

    case "week":
      if (!date) throw new BadRequestError("Missing `date` for filter=week");
      {
        const d = new Date(`${date}T00:00:00Z`);
        const dow = (d.getDay() + 6) % 7; // 0=Monday, ... 6=Sunday
        start = new Date(d);
        start.setDate(d.getDate() - dow);
        start.setHours(0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59);
        periodLabel = `${start.toISOString().slice(0, 10)}→${end
          .toISOString()
          .slice(0, 10)}`;
      }
      break;

    case "month":
      if (!month) throw new BadRequestError("Missing `month` for filter=month");
      {
        const [y, m] = month.split("-").map(Number);
        start = new Date(y, m - 1, 1, 0, 0, 0);
        end = new Date(y, m, 0, 23, 59, 59);
        periodLabel = month;
      }
      break;

    case "year":
      if (!year) throw new BadRequestError("Missing `year` for filter=year");
      {
        const y = Number(year);
        start = new Date(y, 0, 1, 0, 0, 0);
        end = new Date(y, 11, 31, 23, 59, 59);
        periodLabel = String(year);
      }
      break;

    case "all":
    default:
      // leave start/end null to cover all time
      break;
  }

  // 2. Điều kiện lọc theo thời gian
  const timeCond =
    start && end
      ? { appointment_datetime: { [Op.between]: [start, end] } }
      : {};

  // 3. Lấy tất cả appointment trong khoảng, chỉ lấy family_member_id và patient_id
  const currentAppts = await db.Appointment.findAll({
    attributes: ["family_member_id"],
    where: {
      ...timeCond,
      status: { [Op.in]: ["accepted", "waiting_for_confirmation"] },
    },
    raw: true,
  });

  // 4. Đếm distinct bệnh nhân bằng Set
  const currentKeys = new Set();
  for (const { family_member_id, patient_id } of currentAppts) {
    currentKeys.add(family_member_id || patient_id);
  }
  const totalPatients = currentKeys.size;

  // 5. Xác định khoảng "previous" để so sánh
  let prevStart = null,
    prevEnd = null;
  if (start && end) {
    const spanMs = end.getTime() - start.getTime() + 1; // inclusive
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - spanMs + 1);
  }

  // 6. Lấy và đếm appointment của khoảng trước
  let previousTotal = 0;
  if (prevStart && prevEnd) {
    const prevAppts = await db.Appointment.findAll({
      attributes: ["family_member_id"],
      where: {
        appointment_datetime: { [Op.between]: [prevStart, prevEnd] },
        status: { [Op.in]: ["accepted", "waiting_for_confirmation"] },
      },
      raw: true,
    });
    const prevKeys = new Set();
    for (const { family_member_id, patient_id } of prevAppts) {
      prevKeys.add(family_member_id || patient_id);
    }
    previousTotal = prevKeys.size;
  }

  // 7. Tính trend %
  const trend =
    previousTotal > 0
      ? parseFloat(
          (((totalPatients - previousTotal) / previousTotal) * 100).toFixed(1)
        )
      : 0;

  return {
    filter,
    period: periodLabel,
    totalPatients,
    trend,
  };
};

export const getAppointmentStats = async (period) => {
  const statuses = [
    "waiting_for_confirmation",
    "accepted",
    "completed",
    "cancelled",
  ];
  const colors = {
    waiting_for_confirmation: {
      border: "rgba(59, 130, 246, 1)", // blue
      background: "rgba(59, 130, 246, 0.5)",
    },
    accepted: {
      border: "rgba(16, 185, 129, 1)", // green
      background: "rgba(16, 185, 129, 0.5)",
    },
    completed: {
      border: "rgba(139, 92, 246, 1)", // purple
      background: "rgba(139, 92, 246, 0.5)",
    },
    cancelled: {
      border: "rgba(239, 68, 68, 1)", // red
      background: "rgba(239, 68, 68, 0.5)",
    },
  };

  try {
    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    let timeRanges = [];
    let labels = [];

    if (!period) {
      // Default: current day
      const start = now.startOf("day");
      const end = now.endOf("day");
      timeRanges.push({
        start: start.toDate(),
        end: end.toDate(),
        isPast: true,
      });
      labels.push(start.format("DD/MM"));
    } else if (period === "weekly") {
      // Fixed Monday → Friday
      const monday = now.startOf("week").add(1, "day"); // ISO week: Monday is the first day
      for (let i = 0; i < 5; i++) {
        const day = monday.add(i, "day");
        timeRanges.push({
          start: day.startOf("day").toDate(),
          end: day.endOf("day").toDate(),
          isPast: day.isSameOrBefore(now, "day"),
        });
        labels.push(day.format("dddd")); // Monday, Tuesday, ..., Friday
      }
    } else if (period === "monthly") {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const start = now.subtract(i, "month").startOf("month");
        const end = now.subtract(i, "month").endOf("month");
        timeRanges.push({
          start: start.toDate(),
          end: end.toDate(),
          isPast: true,
        });
        labels.push(start.format("MM/YYYY")); // "05/2024", "06/2024", ..., "04/2025"
      }
    } else if (period === "yearly") {
      // Last 6 years
      for (let i = 5; i >= 0; i--) {
        const start = now.subtract(i, "year").startOf("year");
        const end = now.subtract(i, "year").endOf("year");
        timeRanges.push({
          start: start.toDate(),
          end: end.toDate(),
          isPast: true,
        });
        labels.push(start.format("YYYY")); // "2020", "2021", ..., "2025"
      }
    }

    //     const datasets = await Promise.all(
    //       statuses.map(async (status) => {
    //         const data = await Promise.all(
    //           timeRanges.map(({ start, end, isPast }) => {
    //             if (!isPast) return Promise.resolve(null);
    //             const count = await db.Appointment.count({
    //               where: {
    //                 status,
    //                 appointment_datetime: { [Op.between]: [start, end] },
    //               },
    //             });
    //             console.log(`Count for status ${status} from ${start} to ${end}: ${count}`); // Log the count
    //             return count;
    //           })
    //         );
    //         return {
    //           label: status
    //             .split("_")
    //             .map((w) => w[0].toUpperCase() + w.slice(1))
    //             .join(" "),
    //           data,
    //           borderColor: colors[status].border,
    //           backgroundColor: colors[status].background,
    //           tension: 0.4,
    //         };
    //       })
    //     );

    return {
      success: true,
      data: { labels, datasets },
    };
  } catch (error) {
    console.error("Error in getAppointmentStats:", error);
    throw new Error("Failed to get appointment statistics");
  }
};

export const acceptAppointmentByAdmin = async (
  appointment_id,
  { doctor_id, appointment_datetime }
) => {
  const t = await db.sequelize.transaction();
  try {
    // 1. Lấy appointment kèm FamilyMember và Doctor
    const appointment = await db.Appointment.findByPk(appointment_id, {
      include: [
        {
          model: db.FamilyMember,
          as: "FamilyMember",
        },
        {
          model: db.Doctor,
          as: "Doctor",
          include: [
            { model: db.User, as: "user", attributes: ["username"] },
            {
              model: db.Specialization,
              as: "Specialization",
              attributes: ["name", "fees"],
            },
          ],
        },
      ],
      transaction: t,
    });
    if (!appointment) {
      throw new NotFoundError(`Không tìm thấy lịch hẹn #${appointment_id}`);
    }

    // 2. Nếu thay đổi bác sĩ
    if (doctor_id) {
      const doctor = await db.Doctor.findByPk(doctor_id, { transaction: t });
      if (!doctor) {
        throw new BadRequestError(`Bác sĩ #${doctor_id} không tồn tại`);
      }
      appointment.doctor_id = doctor_id;
    }

    // 3. Nếu thay đổi thời gian hẹn
    if (appointment_datetime) {
      const newDate = dayjs(appointment_datetime).tz("Asia/Ho_Chi_Minh", true);
      if (!newDate.isValid()) {
        throw new BadRequestError("appointment_datetime không hợp lệ");
      }
      if (newDate.isBefore(dayjs().tz("Asia/Ho_Chi_Minh"))) {
        throw new BadRequestError("Không thể đặt lịch trong quá khứ");
      }
      // Kiểm tra cuối tuần
      const wd = newDate.day(); // 0=Chủ nhật, 6=Thứ 7
      if (wd === 0 || wd === 6) {
        throw new BadRequestError("Bác sĩ không làm việc thứ 7/CN");
      }
      // Kiểm tra ngày nghỉ của bác sĩ
      const off = await db.DoctorDayOff.findOne({
        where: {
          doctor_id: appointment.doctor_id,
          off_date: newDate.format("YYYY-MM-DD"),
          status: "active",
        },
        transaction: t,
      });
      if (off) {
        const isMorning = newDate.hour() < 12;
        if (
          (off.off_morning && isMorning) ||
          (off.off_afternoon && !isMorning) ||
          (off.off_morning && off.off_afternoon)
        ) {
          throw new BadRequestError(
            "Bác sĩ đã đăng ký nghỉ buổi đó, không thể đặt lịch"
          );
        }
      }
      // Kiểm tra trùng giờ với bác sĩ
      const conflictDoc = await db.Appointment.findOne({
        where: {
          doctor_id: appointment.doctor_id,
          appointment_datetime: newDate.toDate(),
          status: { [Op.in]: ["accepted", "waiting_for_confirmation"] },
          appointment_id: { [Op.ne]: appointment_id },
        },
        transaction: t,
      });
      if (conflictDoc) {
        throw new BadRequestError("Bác sĩ đã có lịch khác vào khung giờ này");
      }
      // Kiểm tra trùng giờ với bệnh nhân
      const famId = appointment.family_member_id;
      const conflictPat = await db.Appointment.findOne({
        where: {
          family_member_id: famId,
          appointment_datetime: newDate.toDate(),
          status: { [Op.in]: ["accepted", "waiting_for_confirmation"] },
          appointment_id: { [Op.ne]: appointment_id },
        },
        transaction: t,
      });
      if (conflictPat) {
        throw new BadRequestError(
          "Bệnh nhân đã có lịch khác vào khung giờ này"
        );
      }
      appointment.appointment_datetime = newDate.toDate();
    }

    // 4. Chuyển trạng thái sang accepted
    appointment.status = "accepted";
    await appointment.save({ transaction: t });
    const formattedDate = dayjs(appointment.appointment_datetime)
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DDTHH:mm:ssZ");
    await sendEmailAcceptAppointment(
      appointment.FamilyMember.email,
      appointment.FamilyMember.username,
      appointment.appointment_datetime
    );
    await t.commit();

    // 5. Format và trả về
    // const formattedDate = dayjs(appointment.appointment_datetime)
    //   .tz("Asia/Ho_Chi_Minh")
    //   .format("YYYY-MM-DDTHH:mm:ssZ");

    return {
      success: true,
      message: "Xác nhận lịch hẹn thành công",
      data: {
        appointment_id: appointment.appointment_id,
        doctor_name: appointment.Doctor.user.username,
        specialization: appointment.Doctor.Specialization.name,
        fees: `${appointment.Doctor.Specialization.fees.toLocaleString(
          "vi-VN"
        )} VNĐ`,
        appointment_datetime: formattedDate,
        status: appointment.status,
        family_member: {
          username: appointment.FamilyMember.username,
          email: appointment.FamilyMember.email,
        },
      },
    };
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
};

export const cancelAppointmentByAdmin = async ({
  appointment_id,
  reason,
  user_id, // user_id của admin
}) => {
  const t = await db.sequelize.transaction();
  try {
    // 1. Lấy admin
    const admin = await db.User.findByPk(user_id, {
      attributes: ["username", "email"],
      include: [{ model: db.Admin, as: "admin", attributes: ["admin_id"] }],
      transaction: t,
    });
    if (!admin) {
      throw new NotFoundError(`Không tìm thấy admin #${user_id}`);
    }

    // 2. Lấy cuộc hẹn
    const appointment = await db.Appointment.findByPk(appointment_id, {
      include: [
        { model: db.FamilyMember, as: "FamilyMember" },
        {
          model: db.Doctor,
          as: "Doctor",
          include: [
            { model: db.User, as: "user", attributes: ["username", "email"] },
          ],
        },
      ],
      transaction: t,
    });
    if (!appointment) {
      throw new NotFoundError(`Không tìm thấy cuộc hẹn #${appointment_id}`);
    }

    // 3. Kiểm tra trạng thái
    const oldStatus = appointment.status;
    const forbidden = [
      "cancelled",
      "completed",
      "doctor_day_off",
      "patient_not_coming",
    ];
    if (forbidden.includes(oldStatus)) {
      throw new BadRequestError(
        `Không thể hủy lịch hẹn đang ở trạng thái "${oldStatus}"`
      );
    }
    if (oldStatus === "accepted" && (!reason || !reason.trim())) {
      throw new BadRequestError(
        "Lý do hủy là bắt buộc khi lịch đã được xác nhận"
      );
    }

    // 4. Cập nhật
    appointment.status = "cancelled";
    appointment.cancelled_at = dayjs().tz("Asia/Ho_Chi_Minh").toDate();
    appointment.cancelled_by = admin.username;
    appointment.cancel_reason = oldStatus === "accepted" ? reason : null;
    await appointment.save({ transaction: t });
    const formattedDate = dayjs(appointment.appointment_datetime)
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DDTHH:mm:ssZ");
    await sendEmailCancelAppointment(
      appointment.FamilyMember.email,
      appointment.FamilyMember.username,
      formattedDate
    );
    await t.commit();

    return {
      success: true,
      message: "Hủy lịch hẹn thành công",
      data: {
        appointment_id: appointment.appointment_id,
        status: appointment.status,
        cancelled_at: dayjs(appointment.cancelled_at)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DDTHH:mm:ssZ"),
        cancelled_by: appointment.cancelled_by,
        cancel_reason: appointment.cancel_reason,
        family_member: {
          username: appointment.FamilyMember.username,
          email: appointment.FamilyMember.email,
        },
        doctor: {
          username: appointment.Doctor.user.username,
          email: appointment.Doctor.user.email,
        },
      },
    };
  } catch (err) {
    // rollback nếu chưa commit
    if (!t.finished) {
      await t.rollback();
    }
    throw err;
  }
};
const VALID_STATUSES = [
  "waiting_for_confirmation",
  "accepted",
  // "completed",
  // "cancelled",
];

// import dayjs from "dayjs";
// import timezone from "dayjs/plugin/timezone";
// import utc from "dayjs/plugin/utc";
// import customParseFormat from "dayjs/plugin/customParseFormat";
// dayjs.extend(utc);
// dayjs.extend(timezone);
// dayjs.extend(customParseFormat);
// dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

export const updateAppointmentByAdmin = async (appointment_id, updateData) => {
  // 1. Lấy appointment kèm FamilyMember + Doctor
  const appointment = await db.Appointment.findByPk(appointment_id, {
    include: [
      { model: db.FamilyMember, as: "FamilyMember" },
      {
        model: db.Doctor,
        as: "Doctor",
        include: [
          { model: db.User, as: "user", attributes: ["username"] },
          {
            model: db.Specialization,
            as: "Specialization",
            attributes: ["name", "fees"],
          },
        ],
      },
    ],
  });

  if (!appointment) {
    throw new NotFoundError(`Không tìm thấy lịch hẹn #${appointment_id}`);
  }

  // 2. Thay đổi bác sĩ (nếu có)
  if (updateData.doctor_id) {
    const doctor = await db.Doctor.findByPk(updateData.doctor_id);
    if (!doctor) {
      throw new BadRequestError(
        `Bác sĩ #${updateData.doctor_id} không tồn tại`
      );
    }
    appointment.doctor_id = updateData.doctor_id;
  }

  // 3. Thay đổi thời gian (nếu có)
  if (updateData.appointment_datetime) {
    // Parse chuẩn input
    const parsedDt = dayjs(
      updateData.appointment_datetime,
      "DD-MM-YYYY HH:mm:ss"
    );
    if (!parsedDt.isValid()) {
      throw new BadRequestError("appointment_datetime không hợp lệ");
    }

    // Convert sang Asia/Ho_Chi_Minh
    const newDt = parsedDt.tz("Asia/Ho_Chi_Minh");

    // Check không ở quá khứ
    if (newDt.isBefore(dayjs().tz("Asia/Ho_Chi_Minh"))) {
      throw new BadRequestError("Không thể đặt lịch trong quá khứ");
    }

    // Check không vào thứ 7 / CN
    const wd = newDt.day(); // 0 = CN, 6 = T7
    if (wd === 0 || wd === 6) {
      throw new BadRequestError("Không đặt lịch vào Thứ 7 hoặc Chủ nhật");
    }

    // Check bác sĩ nghỉ
    const off = await db.DoctorDayOff.findOne({
      where: {
        doctor_id: appointment.doctor_id,
        off_date: newDt.format("YYYY-MM-DD"),
        status: "active",
      },
    });

    if (off) {
      const isMorn = newDt.hour() < 12;
      if (
        (off.off_morning && isMorn) ||
        (off.off_afternoon && !isMorn) ||
        (off.off_morning && off.off_afternoon)
      ) {
        throw new BadRequestError("Bác sĩ đã đăng ký nghỉ buổi này");
      }
    }

    // Check trùng giờ bác sĩ
    const conflictDoc = await db.Appointment.findOne({
      where: {
        doctor_id: appointment.doctor_id,
        appointment_datetime: newDt.toDate(),
        status: { [Op.in]: ["waiting_for_confirmation", "accepted"] },
        appointment_id: { [Op.ne]: appointment_id },
      },
    });
    if (conflictDoc) {
      throw new BadRequestError("Bác sĩ đã có lịch khám vào khung giờ này");
    }

    // Check trùng giờ bệnh nhân
    const conflictPat = await db.Appointment.findOne({
      where: {
        family_member_id: appointment.family_member_id,
        appointment_datetime: newDt.toDate(),
        status: { [Op.in]: ["waiting_for_confirmation", "accepted"] },
        appointment_id: { [Op.ne]: appointment_id },
      },
    });
    if (conflictPat) {
      throw new BadRequestError("Bệnh nhân đã có lịch khám vào khung giờ này");
    }

    // Gán lại
    appointment.appointment_datetime = newDt.toDate();
  }

  // 4. Thay đổi status (nếu có)
  if (updateData.status) {
    if (!VALID_STATUSES.includes(updateData.status)) {
      throw new BadRequestError("Trạng thái không hợp lệ");
    }
    appointment.status = updateData.status;
  }

  // 5. Lưu vào database
  await appointment.save();

  // 6. Trả kết quả
  const formattedDt = dayjs(appointment.appointment_datetime)
    .tz("Asia/Ho_Chi_Minh")
    .format("YYYY-MM-DDTHH:mm:ssZ");

  return {
    success: true,
    message: "Cập nhật lịch hẹn thành công",
    data: {
      appointment_id: appointment.appointment_id,
      doctor_name: appointment.Doctor?.user?.username || "",
      specialization: appointment.Doctor?.Specialization?.name || "",
      fees: appointment.Doctor?.Specialization?.fees || 0,
      appointment_datetime: formattedDt,
      status: appointment.status,
      family_member: {
        username: appointment.FamilyMember?.username || "",
        email: appointment.FamilyMember?.email || "",
      },
    },
  };
};

export const getDoctorbySpecialization = async (specialization_id) => {
  const doctors = await db.Doctor.findAll({
    where: { specialization_id },
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["username", "email"],
      },
    ],
  });
  return doctors;
};
export const getAppointmentByIdDoctor = async (doctor_id) => {
  if (!doctor_id) {
    throw new BadRequestError("Thiếu doctor_id");
  }

  const appointments = await Appointment.findAll({
    where: {
      doctor_id,
      [Op.or]: [
        { status: "cancelled" },
        {
          status: "completed",
        },
      ],
    },
    include: [
      {
        model: Payment,
        as: "Payments",
        where: {
          status: "paid",
        },
        required: false,
      },
      {
        model: FamilyMember,
        as: "FamilyMember",
        attributes: ["username", "email"],
      },
    ],
  });

  const filteredAppointments = appointments.filter((appt) => {
    return (
      appt.status === "cancelled" ||
      (appt.status === "completed" &&
        appt.Payments &&
        appt.Payments.some((p) => p.status === "paid"))
    );
  });

  return {
    success: true,
    data: filteredAppointments,
  };
};
export const getDoctorDayOffs = async (doctor_id, start, end, status, date) => {
  try {
    let whereClause = {
      doctor_id,
    };

    // Add status filtering if provided
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = "active"; // Default to active day-offs
    }

    // Handle date filtering
    if (date) {
      const targetDate = dayjs
        .tz(date, "Asia/Ho_Chi_Minh")
        .format("YYYY-MM-DD");
      whereClause.off_date = targetDate;
    } else if (start && end) {
      whereClause.off_date = {
        [Op.between]: [
          dayjs
            .tz(start, "Asia/Ho_Chi_Minh")
            .startOf("day")
            .format("YYYY-MM-DD"),
          dayjs.tz(end, "Asia/Ho_Chi_Minh").endOf("day").format("YYYY-MM-DD"),
        ],
      };
    } else if (start) {
      whereClause.off_date = {
        [Op.gte]: dayjs
          .tz(start, "Asia/Ho_Chi_Minh")
          .startOf("day")
          .format("YYYY-MM-DD"),
      };
    } else if (end) {
      whereClause.off_date = {
        [Op.lte]: dayjs
          .tz(end, "Asia/Ho_Chi_Minh")
          .endOf("day")
          .format("YYYY-MM-DD"),
      };
    }

    const dayOffs = await DoctorDayOff.findAll({
      where: whereClause,
      order: [["off_date", "ASC"]],
    });

    // Format response with affected appointments
    const formattedDayOffs = await Promise.all(
      dayOffs.map(async (dayOff) => {
        const affectedAppointments = await Appointment.findAll({
          where: {
            doctor_id,
            status: "doctor_day_off",
            appointment_datetime: {
              [Op.between]: [
                dayjs
                  .tz(dayOff.off_date, "Asia/Ho_Chi_Minh")
                  .startOf("day")
                  .format("YYYY-MM-DD HH:mm:ss"),
                dayjs
                  .tz(dayOff.off_date, "Asia/Ho_Chi_Minh")
                  .endOf("day")
                  .format("YYYY-MM-DD HH:mm:ss"),
              ],
            },
          },
          include: [
            {
              model: db.FamilyMember,
              as: "FamilyMember",
              attributes: ["phone_number", "username", "email"],
            },
          ],
        });

        return {
          id: dayOff.day_off_id,
          date: dayjs(dayOff.off_date)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD"),
          morning: dayOff.off_morning,
          afternoon: dayOff.off_afternoon,
          reason: dayOff.reason,
          status: dayOff.status,
          createdAt: dayjs(dayOff.createdAt).tz("Asia/Ho_Chi_Minh").format(),
          affected_appointments: affectedAppointments.map((apt) => ({
            id: apt.appointment_id,
            datetime: dayjs(apt.appointment_datetime)
              .tz("Asia/Ho_Chi_Minh")
              .format(),
            patient_name: apt.FamilyMember?.username || "Không có thông tin",
            patient_phone:
              apt.FamilyMember?.phone_number || "Không có số điện thoại",
            patient_email: apt.FamilyMember?.email || "Không có email",
          })),
        };
      })
    );

    return {
      success: true,
      message: "Lấy danh sách ngày nghỉ thành công",
      data: formattedDayOffs,
    };
  } catch (error) {
    console.error("Error in getDoctorDayOffs:", error);
    throw new InternalServerError("Có lỗi xảy ra khi lấy danh sách ngày nghỉ");
  }
};
export const getDoctorStats = async (doctor_id) => {
  if (!doctor_id) throw new BadRequestError("Thiếu doctor_id");

  // Tổng số lịch hẹn của bác sĩ
  const totalAppointments = await Appointment.count({
    where: { doctor_id },
  });

  // Số lịch hẹn hoàn thành + đã thanh toán
  const completedPaidAppointments = await Appointment.count({
    where: {
      doctor_id,
      status: "completed",
    },
    include: [
      {
        model: Payment,
        as: "Payments",
        where: {
          status: "paid",
        },
        required: true, // chỉ tính nếu có payment paid
      },
    ],
  });

  // Số lịch bị huỷ
  const cancelledAppointments = await Appointment.count({
    where: {
      doctor_id,
      status: "cancelled",
    },
  });

  return {
    success: true,
    message: "Thống kê lịch hẹn bác sĩ thành công",
    data: {
      total: totalAppointments,
      completed_paid: completedPaidAppointments,
      cancelled: cancelledAppointments,
    },
  };
};
export const updateDoctor = async (doctor_id, updateData) => {
  const t = await db.sequelize.transaction();
  try {
    // 1. Kiểm tra bác sĩ tồn tại
    const doctor = await db.Doctor.findByPk(doctor_id, {
      include: [{ model: db.User, as: "user" }],
      transaction: t,
    });
    if (!doctor) throw new NotFoundError("Không tìm thấy bác sĩ");

    // 2. Cập nhật bảng Doctor
    const doctorFields = [
      "degree",
      "experience_years",
      "description",
      "specialization_id",
    ];
    const doctorUpdates = {};
    for (let field of doctorFields) {
      if (updateData[field] !== undefined)
        doctorUpdates[field] = updateData[field];
    }

    if (Object.keys(doctorUpdates).length > 0) {
      await doctor.update(doctorUpdates, { transaction: t });
    }

    // 3. Cập nhật bảng Users nếu có truyền username
    const userUpdates = {};
    if (updateData.username !== undefined) {
      userUpdates.username = updateData.username;
    }
    if (Object.keys(userUpdates).length > 0) {
      await doctor.user.update(userUpdates, { transaction: t });
    }

    await t.commit();
    return {
      success: true,
      message: "Cập nhật bác sĩ thành công",
    };
  } catch (err) {
    await t.rollback();
    console.error("Error in updateDoctor:", err);
    throw new InternalServerError("Không thể cập nhật bác sĩ");
  }
};
