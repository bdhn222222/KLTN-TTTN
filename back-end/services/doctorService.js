import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
import ForbiddenError from "../errors/forbidden.js";
import InternalServerError from "../errors/internalServerError.js";
import { Op, fn, col, literal, Sequelize } from "sequelize";
import cloudinary from "../config/cloudinary.js";

const {
  User,
  Doctor,
  DoctorDayOff,
  Appointment,
  Patient,
  CompensationCode,
  MedicalRecord,
  PrescriptionMedicine,
  Prescription,
  FamilyMember,
  Medicine,
  Specialization,
  Schedule,
  Payment,
} = db;
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js"; // Sử dụng phần mở rộng .js
import timezone from "dayjs/plugin/timezone.js"; // Sử dụng phần mở rộng .js
import { v4 as uuidv4 } from "uuid";
import familyMember from "../models/familyMember.js";

dayjs.extend(timezone);
dayjs.extend(utc);

export const registerDoctor = async ({
  username,
  email,
  password,
  specialization_id,
  degree,
  experience_years,
  description,
}) => {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) throw new BadRequestError("Email đã được đăng ký");

  const newUser = await User.create({
    username,
    email,
    password,
    role: "doctor",
  });

  const newDoctor = await Doctor.create({
    user_id: newUser.user_id,
    specialization_id,
    degree,
    experience_years,
    description,
  });

  return { message: "Đăng ký account Bác sĩ thành công", doctor: newDoctor };
};

export const loginDoctor = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email, role: "doctor" },
    include: {
      model: Doctor,
      as: "doctor",
      include: [
        {
          model: db.Specialization,
          as: "Specialization",
          attributes: ["fees"],
        },
      ],
    },
  });
  if (!user) {
    throw new NotFoundError("Không tìm thấy tài khoản Bác sĩ");
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new UnauthorizedError("Mật khẩu không chính xác");
  const token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  return {
    message: "Đăng nhập thành công",
    token,
    doctor: {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role,
      specialization_id: user.doctor.specialization_id,
      degree: user.doctor.degree,
      experience_years: user.doctor.experience_years,
      fees: user.doctor.Specialization?.fees || 0,
    },
  };
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

export const getAllAppointments = async ({
  doctor_id,
  filter_date,
  status,
  start_date,
  end_date,
}) => {
  // Xây dựng điều kiện where cho query
  const whereClause = {
    doctor_id,
  };

  // Thêm điều kiện lọc theo trạng thái nếu có
  if (status) {
    whereClause.status = status;
  }

  // Xử lý điều kiện lọc theo ngày với múi giờ Việt Nam
  if (filter_date) {
    const filterDay = dayjs.tz(filter_date, "Asia/Ho_Chi_Minh").startOf("day");
    whereClause.appointment_datetime = {
      [Op.between]: [
        filterDay.format("YYYY-MM-DD HH:mm:ss"),
        filterDay.endOf("day").format("YYYY-MM-DD HH:mm:ss"),
      ],
    };
  } else if (start_date && end_date) {
    whereClause.appointment_datetime = {
      [Op.between]: [
        dayjs
          .tz(start_date, "Asia/Ho_Chi_Minh")
          .startOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
        dayjs
          .tz(end_date, "Asia/Ho_Chi_Minh")
          .endOf("day")
          .format("YYYY-MM-DD HH:mm:ss"),
      ],
    };
  }

  // Lấy danh sách lịch hẹn
  const appointments = await Appointment.findAll({
    where: whereClause,
    include: [
      {
        model: FamilyMember,
        as: "FamilyMember",
        include: {
          model: Patient,
          as: "patient",
          include: {
            model: User,
            as: "user",
            attributes: ["user_id", "username", "email"],
          },
        },
      },
      {
        model: Doctor,
        as: "Doctor",
        include: {
          model: User,
          as: "user",
          attributes: ["user_id", "username", "email"],
        },
      },
    ],
    order: [["appointment_datetime", "DESC"]],
  });

  // Format dữ liệu trả về với múi giờ Việt Nam
  return {
    success: true,
    message: "Lấy danh sách lịch hẹn thành công",
    data: appointments.map((appointment) => ({
      appointment_id: appointment.appointment_id,
      family_name: appointment.FamilyMember.username,
      family_email: appointment.FamilyMember.email,
      family_dob: appointment.FamilyMember.date_of_birth,
      family_gender: appointment.FamilyMember.gender,
      appointment_datetime: dayjs(appointment.appointment_datetime)
        .tz("Asia/Ho_Chi_Minh")
        .format("YYYY-MM-DDTHH:mm:ss"),
      status: appointment.status,
      fees: appointment.fees,
      doctor_id: appointment.doctor_id,
    })),
  };
};

export const getStatistics = async () => {
  const today = dayjs().startOf("day").toDate();
  const tomorrow = dayjs().add(1, "day").startOf("day").toDate();

  // Tổng số bệnh nhân từng khám và thanh toán
  const totalPatients = await Appointment.count({
    distinct: true,
    col: "family_member_id",
    include: [
      {
        model: Payment,
        as: "Payments",
        where: { status: "paid" },
      },
    ],
    where: {
      status: "completed",
    },
  });

  // Bệnh nhân hôm nay
  const todayPatients = await Appointment.count({
    distinct: true,
    col: "family_member_id",
    include: [
      {
        model: Payment,
        where: { status: "paid" },
      },
    ],
    where: {
      status: "completed",
      appointment_datetime: {
        [Op.gte]: today,
        [Op.lt]: tomorrow,
      },
    },
  });

  // Lịch hẹn hôm nay
  const todayAppointments = await Appointment.count({
    where: {
      appointment_datetime: {
        [Op.gte]: today,
        [Op.lt]: tomorrow,
      },
    },
  });

  return {
    total_patients: totalPatients,
    today_patients: todayPatients,
    today_appointments: todayAppointments,
    today_date: dayjs().format("DD/MM/YYYY"),
  };
};

export const getDoctorSummary = async (doctor_id) => {
  const totalAppointments = await db.Appointment.count({
    where: { doctor_id },
  });
  const uniquePatients = await db.Appointment.aggregate("patient_id", "count", {
    distinct: true,
    where: { doctor_id },
  });
  const appointmentsByStatus = await db.Appointment.findfull({
    where: { doctor_id },
    attributes: [
      "status",
      [db.Sequelize.fn("COUNT", db.Sequelize.col("status")), "count"],
    ],
    group: ["status"],
  });
  return {
    success: true,
    message: "Lấy thống kê lịch hẹn thành công",
    data: {
      totalAppointments,
      uniquePatients,
      appointmentsByStatus,
    },
  };
};

export const getDoctorAppointmentStats = async (doctor_id, start, end) => {
  // Validate dates
  if (start && !dayjs(start).isValid()) {
    throw new BadRequestError("Ngày bắt đầu không hợp lệ");
  }
  if (end && !dayjs(end).isValid()) {
    throw new BadRequestError("Ngày kết thúc không hợp lệ");
  }
  if (start && end && dayjs(end).isBefore(dayjs(start))) {
    throw new BadRequestError("Ngày kết thúc phải sau ngày bắt đầu");
  }

  const whereClause = { doctor_id };
  if (start && end) {
    whereClause.appointment_datetime = {
      [Op.between]: [new Date(start), new Date(end)],
    };
  }

  const appointments = await db.Appointment.findfull({
    where: whereClause,
    include: [
      {
        model: db.Patient,
        as: "Patient",
        include: {
          model: db.User,
          as: "user",
          attributes: ["user_id", "username", "email"],
        },
      },
    ],
  });

  const totalAppointments = appointments.length;
  const uniquePatients = new Set(appointments.map((a) => a.patient.patient_id))
    .size;

  const statusMap = {};
  appointments.forEach((appointment) => {
    statusMap[appointment.status] = (statusMap[appointment.status] || 0) + 1;
  });

  const appointmentsByStatus = Object.entries(statusMap).map(
    ([status, count]) => ({
      status,
      count,
    })
  );

  return {
    success: true,
    message: "Lấy thống kê lịch hẹn thành công",
    data: {
      totalAppointments,
      uniquePatients,
      appointmentsByStatus,
      appointments: appointments.map((apt) => ({
        id: apt.appointment_id,
        datetime: apt.appointment_datetime,
        status: apt.status,
        patient: {
          id: apt.patient.patient_id,
          name: apt.patient.user.username,
          email: apt.patient.user.email,
        },
      })),
    },
  };
};

export const getAppointmentDetails = async (appointment_id, doctor_id) => {
  const appointment = await db.Appointment.findOne({
    where: { appointment_id, doctor_id },
    include: [
      {
        model: db.FamilyMember,
        as: "FamilyMember",
        include: {
          model: db.Patient,
          as: "patient",
          include: {
            model: db.User,
            as: "user",
            attributes: ["user_id", "username", "email"],
          },
        },
      },
      {
        model: db.Doctor,
        as: "Doctor",
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["user_id", "username", "email"],
          },
          {
            model: db.Specialization,
            as: "Specialization",
            include: {
              model: db.SymptomSpecializationMapping,
              as: "mappings",
              include: {
                model: db.Symptom,
                as: "symptom",
                attributes: ["symptom_id", "name"],
              },
            },
          },
        ],
      },
      // {
      //   model: db.Patient,
      //   as: "Patient",
      //   include: {
      //     model: db.User,
      //     as: "user",
      //     attributes: ["user_id", "username", "email"],
      //   },
      // },
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
            include: [
              {
                model: db.Medicine,
                as: "Medicine",
                attributes: ["medicine_id", "name", "price"],
              },
            ],
          },
        ],
      },
      {
        model: db.Payment,
        as: "Payments",
        attributes: [
          "payment_id",
          "amount",
          "payment_method",
          "status",
          "createdAt",
        ],
      },
      {
        model: db.Feedback,
        as: "Feedback",
        attributes: ["rating", "comment", "createdAt"],
      },
    ],
  });

  if (!appointment) {
    throw new NotFoundError("Lịch hẹn không tồn tại");
  }

  return {
    success: true,
    message: "Lấy chi tiết lịch hẹn thành công",
    data: {
      appointment_info: {
        id: appointment.appointment_id,
        datetime: appointment.appointment_datetime,
        status: appointment.status,
        fees: appointment.fees,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
        ...(["cancelled", "doctor_day_off", "patient_not_coming"].includes(
          appointment.status
        ) && {
          cancel_reason: appointment.cancel_reason,
          cancelled_by: appointment.cancelled_by,
          cancelled_at: appointment.cancelled_at,
        }),
      },
      // patient: {
      //   id: appointment.FamilyMember?.Patient.patient_id,
      //   user_id: appointment.FamilyMember?.Patient.user.user_id,
      //   name: appointment.FamilyMember?.Patient.user.username,
      //   email: appointment.FamilyMember?.Patient.user.email,
      // },
      familyMember: {
        id: appointment.FamilyMember?.family_member_id,
        name: appointment.FamilyMember.username,
        gender: appointment.FamilyMember.gender,
        email: appointment.FamilyMember.email,
        dob: appointment.FamilyMember.date_of_birth,
      },
      symptoms: appointment.Doctor.Specialization?.mappings.symptom
        ? {
            name: appointment.appointment.Doctor.Specialization?.mappings.symptom.map(
              (symptom) => symptom.name
            ),
          }
        : null,
      medical_record: appointment.MedicalRecord
        ? {
            id: appointment.MedicalRecord.record_id,
            diagnosis: appointment.MedicalRecord.diagnosis,
            treatment: appointment.MedicalRecord.treatment,
            notes: appointment.MedicalRecord.notes,
            createdAt: appointment.MedicalRecord.createdAt,
          }
        : null,
      prescription: appointment.Prescription
        ? {
            id: appointment.Prescription.prescription_id,
            status: appointment.Prescription.status,
            // medicine_details: appointment.Prescription.medicine_details,

            medicines: appointment.Prescription.prescriptionMedicines.map(
              (pm) => ({
                id: pm.Medicine?.medicine_id,
                name: pm.Medicine?.name,
                quantity: pm.quantity,
                dosage: pm.dosage || null,
                frequency: pm.frequency || null,
                duration: pm.duration || null,
                instructions: pm.instructions || null,
                price: pm.Medicine?.price,
                total: pm.quantity * (pm.Medicine?.price || 0),
                note: pm.note,
              })
            ),
            note: appointment.Prescription.note,
            createdAt: appointment.Prescription.createdAt,
          }
        : null,
      payment: appointment.Payments
        ? {
            id: appointment.Payments.payment_id,
            amount: appointment.Payments.amount,
            status: appointment.Payments.status,
            payment_method: appointment.Payments.payment_method,
            payment_date: appointment.Payments.createdAt,
          }
        : null,
      // feedback: appointment.Feedback
      //   ? {
      //       rating: appointment.Feedback.rating,
      //       comment: appointment.Feedback.comment,
      //       createdAt: appointment.Feedback.createdAt,
      //     }
      //   : null,
    },
  };
};

export const cancelAppointment = async (
  appointment_id,
  doctor_id,
  reason,
  cancelled_by = "doctor"
) => {
  const t = await db.sequelize.transaction();

  try {
    const appointment = await db.Appointment.findOne({
      where: { appointment_id, doctor_id },
      include: [
        {
          model: db.FamilyMember,
          as: "FamilyMember",
          // include: {
          //   model: db.Patient,
          //   as: "patient",
          //   include: {
          //     model: db.User,
          //     as: "user",
          //     attributes: ["user_id", "username", "email"],
          //   },
          // },
        },
        {
          model: db.Doctor,
          as: "Doctor",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["email", "username"],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!appointment) {
      throw new NotFoundError("Lịch hẹn không tồn tại");
    }

    const invalidStatuses = [
      "cancelled",
      "completed",
      "doctor_day_off",
      "patient_not_coming",
    ];
    if (invalidStatuses.includes(appointment.status)) {
      throw new BadRequestError(
        `Không thể hủy lịch hẹn đã ${
          appointment.status === "cancelled"
            ? "bị hủy"
            : appointment.status === "completed"
            ? "hoàn thành"
            : appointment.status === "doctor_day_off"
            ? "bị nghỉ"
            : "được đánh dấu bệnh nhân không đến"
        }`
      );
    }

    // Đơn giản hóa: Không kiểm tra thời gian và không tạo mã đền bù
    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    const appointmentTime = dayjs(appointment.appointment_datetime).tz(
      "Asia/Ho_Chi_Minh"
    );

    // Cập nhật trạng thái cuộc hẹn thành cancelled
    appointment.status = "cancelled";
    appointment.cancelled_at = now.toDate();
    appointment.cancelled_by = cancelled_by;
    appointment.cancel_reason = reason;
    await appointment.save({ transaction: t });

    await t.commit();

    return {
      success: true,
      message: "Huỷ lịch hẹn thành công",
      data: {
        appointment_id: appointment.appointment_id,
        status: appointment.status,
        family_member: {
          name: appointment.FamilyMember.username,
          email: appointment.FamilyMember.email,
          dob: appointment.FamilyMember.date_of_birth,
        },
        doctor: {
          name: appointment.Doctor.user.username,
          email: appointment.Doctor.user.email,
        },
        datetime: appointmentTime.format("YYYY-MM-DDTHH:mm:ssZ"),
        cancelled_at: dayjs(appointment.cancelled_at)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DDTHH:mm:ssZ"),
        cancelled_by:
          cancelled_by === "doctor"
            ? appointment.Doctor.user.username
            : appointment.Patient.user.username,
        cancel_reason: appointment.cancel_reason,
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const markPatientNotComing = async (appointment_id, doctor_id) => {
  const appointment = await db.Appointment.findOne({
    where: { appointment_id, doctor_id },
  });
  if (!appointment) {
    throw new NotFoundError("Lịch hẹn không tồn tại");
  }
  if (
    ["completed", "cancelled", "patient_not_coming"].includes(
      appointment.status
    )
  ) {
    throw new BadRequestError("Không thể cập nhật trạng thái lịch hẹn này");
  }
  const now = dayjs();
  const appointmentTime = dayjs(appointment.appointment_datetime);
  if (appointmentTime.isBefore(now)) {
    throw new BadRequestError(
      "Không thể cập nhật trạng thái lịch hẹn đã diễn ra"
    );
  }
  appointment.status = "patient_not_coming";
  await appointment.save();
  return {
    success: true,
    message: "Đã đánh dấu bệnh nhân không đến khám",
    data: {
      appointment_id: appointment.appointment_id,
      status: appointment.status,
    },
  };
};

export const completeAppointment = async (
  appointment_id,
  doctor_id,
  medical_data = null
) => {
  // Kiểm tra cuộc hẹn
  const appointment = await db.Appointment.findOne({
    where: { appointment_id, doctor_id },
    include: [
      {
        model: db.Doctor,
        as: "Doctor",
        include: [
          {
            model: db.Specialization,
            as: "Specialization",
            attributes: ["fees"],
          },
        ],
      },
    ],
  });

  if (!appointment) {
    throw new NotFoundError("Lịch hẹn không tồn tại");
  }

  if (appointment.status !== "accepted") {
    throw new BadRequestError("Chỉ được hoàn thành lịch hẹn đã được tiếp nhận");
  }

  // Kiểm tra và tạo hồ sơ bệnh án nếu chưa có
  let medicalRecord = await db.MedicalRecord.findOne({
    where: { appointment_id },
  });

  if (!medicalRecord && medical_data) {
    medicalRecord = await db.MedicalRecord.create({
      appointment_id,
      ...medical_data,
      created_by: doctor_id,
      completed_at: new Date(),
      completed_by: doctor_id,
    });
  } else if (!medicalRecord) {
    throw new BadRequestError("Vui lòng cung cấp thông tin hồ sơ bệnh án");
  }

  // Kiểm tra đơn thuốc
  const prescription = await db.Prescription.findOne({
    where: { appointment_id },
  });

  if (!prescription) {
    throw new BadRequestError(
      "Vui lòng tạo đơn thuốc trước khi hoàn thành cuộc hẹn"
    );
  }

  // Tạo bản ghi thanh toán phí khám
  const payment = await db.Payment.create({
    appointment_id,
    amount: appointment.Doctor.Specialization.fees || 0,
    status: "pending",
    payment_method: "cash",
    created_by: doctor_id,
  });

  // Cập nhật trạng thái cuộc hẹn
  appointment.status = "completed";
  await appointment.save();

  // Cập nhật trạng thái hồ sơ bệnh án nếu chưa hoàn thành
  if (!medicalRecord.completed_at) {
    medicalRecord.completed_at = new Date();
    medicalRecord.completed_by = doctor_id;
    await medicalRecord.save();
  }

  return {
    success: true,
    message: "Cập nhật lịch hẹn hoàn thành thành công",
    data: {
      appointment_id: appointment.appointment_id,
      status: appointment.status,
      medical_record: {
        record_id: medicalRecord.record_id,
        completed_at: medicalRecord.completed_at,
      },
      prescription: {
        prescription_id: prescription.prescription_id,
      },
      payment: {
        payment_id: payment.payment_id,
        amount: payment.amount,
        status: payment.status,
      },
    },
  };
};

export const getDoctorDayOffs = async (doctor_id, start, end, status, date) => {
  try {
    let whereClause = {
      doctor_id,
    };

    // Thêm điều kiện lọc theo trạng thái nếu có
    if (status) {
      whereClause.status = status;
    } else {
      // Mặc định chỉ lấy các ngày nghỉ còn active
      whereClause.status = "active";
    }

    // Xử lý điều kiện lọc theo ngày với múi giờ Việt Nam
    if (date) {
      // Nếu có date, lấy ngày nghỉ của ngày cụ thể
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
      // Nếu chỉ có ngày bắt đầu, lấy từ ngày đó đến hiện tại
      whereClause.off_date = {
        [Op.gte]: dayjs
          .tz(start, "Asia/Ho_Chi_Minh")
          .startOf("day")
          .format("YYYY-MM-DD"),
      };
    } else if (end) {
      // Nếu chỉ có ngày kết thúc, lấy từ quá khứ đến ngày đó
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

    // Format response với múi giờ Việt Nam và lấy thông tin các cuộc hẹn bị ảnh hưởng
    const formattedDayOffs = await Promise.all(
      dayOffs.map(async (dayOff) => {
        // Tìm các cuộc hẹn bị ảnh hưởng
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
              include: [
                // {
                //   model: User,
                //   as: "user",
                //   attributes: ["email", "username"],
                // },
              ],
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

export const createDoctorDayOff = async (
  doctor_id,
  off_date,
  time_off,
  reason
) => {
  // Bắt đầu transaction
  const t = await db.sequelize.transaction();

  try {
    // 1. Validate thời gian nghỉ
    if (!off_date || !time_off) {
      throw new BadRequestError("Thiếu thông tin ngày nghỉ hoặc buổi nghỉ");
    }

    if (!["morning", "afternoon", "full"].includes(time_off)) {
      throw new BadRequestError("Buổi nghỉ không hợp lệ");
    }

    // Chuyển đổi ngày nghỉ sang múi giờ Việt Nam và lấy đầu ngày
    const dayOffDate = dayjs.tz(off_date, "Asia/Ho_Chi_Minh").startOf("day");
    if (!dayOffDate.isValid()) {
      throw new BadRequestError("Ngày nghỉ không hợp lệ");
    }

    // Kiểm tra có phải cuối tuần không
    const dayOfWeek = dayOffDate.day(); // 0 là Chủ nhật, 6 là thứ 7
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new BadRequestError(
        "Không thể đăng ký nghỉ vào thứ 7 hoặc chủ nhật"
      );
    }

    // So sánh với thời gian hiện tại ở múi giờ Việt Nam (đầu ngày)
    const today = dayjs().tz("Asia/Ho_Chi_Minh").startOf("day");
    if (dayOffDate.isBefore(today)) {
      throw new BadRequestError("Không thể đăng ký ngày nghỉ trong quá khứ");
    }

    // Hàm trợ giúp để lấy điều kiện thời gian dựa trên time_off
    const getTimeCondition = (timeOffType) => {
      if (timeOffType === "morning") {
        return Sequelize.where(
          Sequelize.fn(
            "TIME",
            Sequelize.fn(
              "CONVERT_TZ",
              Sequelize.col("appointment_datetime"),
              "+00:00",
              "+07:00"
            )
          ),
          {
            [Op.between]: ["08:00:00", "11:30:00"],
          }
        );
      } else if (timeOffType === "afternoon") {
        return Sequelize.where(
          Sequelize.fn(
            "TIME",
            Sequelize.fn(
              "CONVERT_TZ",
              Sequelize.col("appointment_datetime"),
              "+00:00",
              "+07:00"
            )
          ),
          {
            [Op.between]: ["13:30:00", "17:00:00"],
          }
        );
      } else {
        return {};
      }
    };

    // 2. Kiểm tra xem đã đăng ký nghỉ chưa
    const existingDayOff = await db.DoctorDayOff.findOne({
      where: {
        doctor_id,
        off_date: dayOffDate.format("YYYY-MM-DD"),
        status: "active",
      },
      transaction: t,
    });

    let affectedAppointments = [];
    let message = "Đăng ký ngày nghỉ thành công";
    let updatedDayOff;

    // Nếu đã có ngày nghỉ, kiểm tra xem có thể đăng ký thêm không
    if (existingDayOff) {
      if (time_off === "full") {
        // Nếu đã đăng ký cả hai buổi, báo lỗi
        if (existingDayOff.off_morning && existingDayOff.off_afternoon) {
          throw new BadRequestError("Bạn đã đăng ký nghỉ cả ngày này");
        }
        // Nếu đã đăng ký một buổi, cho phép đăng ký thêm buổi còn lại
        message = "Cập nhật ngày nghỉ thành công";
      } else if (time_off === "morning" && existingDayOff.off_morning) {
        throw new BadRequestError("Bạn đã đăng ký nghỉ buổi sáng của ngày này");
      } else if (time_off === "afternoon" && existingDayOff.off_afternoon) {
        throw new BadRequestError(
          "Bạn đã đăng ký nghỉ buổi chiều của ngày này"
        );
      }

      const updateData = {};
      let reasonUpdate = existingDayOff.reason || "";

      if (time_off === "morning" && !existingDayOff.off_morning) {
        updateData.off_morning = true;
        reasonUpdate = reasonUpdate ? `${reasonUpdate}; ${reason}` : reason;
      } else if (time_off === "afternoon" && !existingDayOff.off_afternoon) {
        updateData.off_afternoon = true;
        reasonUpdate = reasonUpdate ? `${reasonUpdate}; ${reason}` : reason;
      } else if (time_off === "full") {
        // Nếu đăng ký full, cập nhật buổi còn lại
        if (!existingDayOff.off_morning) {
          updateData.off_morning = true;
        }
        if (!existingDayOff.off_afternoon) {
          updateData.off_afternoon = true;
        }
        reasonUpdate = reasonUpdate ? `${reasonUpdate}; ${reason}` : reason;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.reason = reasonUpdate;
        await existingDayOff.update(updateData, { transaction: t });
        updatedDayOff = await db.DoctorDayOff.findByPk(
          existingDayOff.day_off_id,
          { transaction: t }
        );
        message = "Cập nhật ngày nghỉ thành công";

        // Tìm và cập nhật các lịch hẹn bị ảnh hưởng
        const timeCondition = getTimeCondition(time_off);

        const foundAppointments = await db.Appointment.findAll({
          where: {
            doctor_id,
            status: {
              [Op.in]: ["accepted", "waiting_for_confirmation"],
            },
            [Op.and]: [
              Sequelize.where(
                Sequelize.fn("DATE", Sequelize.col("appointment_datetime")),
                dayOffDate.format("YYYY-MM-DD")
              ),
              timeCondition,
            ],
          },
          include: [
            {
              model: db.FamilyMember,
              as: "FamilyMember",
              attributes: ["name", "phone_number", "email"],
            },
          ],
          transaction: t,
        });

        // Cập nhật trạng thái các lịch hẹn bị ảnh hưởng
        if (foundAppointments.length > 0) {
          await db.Appointment.update(
            { status: "doctor_day_off" },
            {
              where: {
                appointment_id: foundAppointments.map(
                  (apt) => apt.appointment_id
                ),
              },
              transaction: t,
            }
          );
          affectedAppointments = foundAppointments;
        }
      } else {
        return {
          success: true,
          message: "Ngày nghỉ này đã được đăng ký cho buổi này",
          data: {
            id: existingDayOff.day_off_id,
            date: dayjs(existingDayOff.off_date)
              .tz("Asia/Ho_Chi_Minh")
              .format("YYYY-MM-DD"),
            morning: existingDayOff.off_morning,
            afternoon: existingDayOff.off_afternoon,
            reason: existingDayOff.reason,
            createdAt: dayjs(existingDayOff.createdAt)
              .tz("Asia/Ho_Chi_Minh")
              .format(),
            affected_appointments: [],
          },
        };
      }
    } else {
      // 3. Tạo ngày nghỉ mới
      const newDayOff = await db.DoctorDayOff.create(
        {
          doctor_id,
          off_date: dayOffDate.format("YYYY-MM-DD"),
          off_morning: time_off === "morning" || time_off === "full",
          off_afternoon: time_off === "afternoon" || time_off === "full",
          reason,
          status: "active",
        },
        { transaction: t }
      );
      updatedDayOff = newDayOff;

      // 4. Tìm các lịch hẹn bị ảnh hưởng
      const timeCondition = getTimeCondition(time_off);

      const foundAppointments = await db.Appointment.findAll({
        where: {
          doctor_id,
          status: {
            [Op.in]: ["accepted", "waiting_for_confirmation"],
          },
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn("DATE", Sequelize.col("appointment_datetime")),
              dayOffDate.format("YYYY-MM-DD")
            ),
            timeCondition,
          ],
        },
        include: [
          {
            model: db.FamilyMember,
            as: "FamilyMember",
            attributes: ["username", "phone_number", "email"],
          },
        ],
        transaction: t,
      });

      // Cập nhật trạng thái của các lịch hẹn bị ảnh hưởng
      if (foundAppointments.length > 0) {
        await db.Appointment.update(
          { status: "doctor_day_off" },
          {
            where: {
              appointment_id: foundAppointments.map(
                (apt) => apt.appointment_id
              ),
            },
            transaction: t,
          }
        );
        affectedAppointments = foundAppointments;
      }
    }

    await t.commit();

    return {
      success: true,
      message,
      data: {
        id: updatedDayOff.day_off_id,
        date: dayjs(updatedDayOff.off_date)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD"),
        morning: updatedDayOff.off_morning,
        afternoon: updatedDayOff.off_afternoon,
        reason: updatedDayOff.reason,
        status: updatedDayOff.status,
        createdAt: dayjs(updatedDayOff.createdAt)
          .tz("Asia/Ho_Chi_Minh")
          .format(),
        affected_appointments:
          affectedAppointments.length > 0
            ? affectedAppointments.map((apt) => ({
                id: apt.appointment_id,
                datetime: dayjs(apt.appointment_datetime)
                  .tz("Asia/Ho_Chi_Minh")
                  .format(),
                patient_name: apt.FamilyMember?.name || "Không có thông tin",
                patient_phone:
                  apt.FamilyMember?.phone_number || "Không có số điện thoại",
                patient_email: apt.FamilyMember?.email || "Không có email",
              }))
            : [],
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const cancelDoctorDayOff = async (doctor_id, day_off_id, time_off) => {
  // Bắt đầu transaction
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra ngày nghỉ tồn tại
    const dayOff = await db.DoctorDayOff.findOne({
      where: {
        doctor_id,
        day_off_id,
        status: "active",
      },
      transaction: t,
    });

    if (!dayOff) {
      throw new NotFoundError("Không tìm thấy ngày nghỉ");
    }

    // 2. Kiểm tra thời gian hủy
    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    const today = now.startOf("day");
    const currentHour = now.hour();
    const offDate = dayjs(dayOff.off_date)
      .tz("Asia/Ho_Chi_Minh")
      .startOf("day");

    // Nếu ngày nghỉ trong quá khứ
    if (offDate.isBefore(today)) {
      throw new BadRequestError("Không thể hủy ngày nghỉ trong quá khứ");
    }

    // Nếu là ngày hiện tại
    if (offDate.isSame(today, "day")) {
      // Nếu hủy cả ngày -> không cho phép
      if (time_off === "full") {
        throw new BadRequestError("Không thể hủy cả ngày vào ngày hiện tại");
      }

      // Nếu là buổi sáng và đã quá 8h sáng
      if (time_off === "morning" && currentHour >= 8) {
        throw new BadRequestError("Không thể hủy ca sáng sau 8h sáng");
      }

      // Nếu là buổi chiều và đã quá 13h30
      if (time_off === "afternoon" && currentHour >= 13) {
        throw new BadRequestError("Không thể hủy ca chiều sau 13h");
      }
    }

    // 3. Kiểm tra time_off hợp lệ
    if (!["morning", "afternoon", "full"].includes(time_off)) {
      throw new BadRequestError("Buổi nghỉ không hợp lệ");
    }

    // 4. Kiểm tra xem có đăng ký nghỉ buổi đó không
    if (time_off === "morning" && !dayOff.off_morning) {
      throw new BadRequestError("Bạn chưa đăng ký nghỉ buổi sáng");
    }
    if (time_off === "afternoon" && !dayOff.off_afternoon) {
      throw new BadRequestError("Bạn chưa đăng ký nghỉ buổi chiều");
    }

    // 5. Tìm các lịch hẹn bị ảnh hưởng dựa trên buổi được chọn
    const whereClause = {
      doctor_id,
      status: "doctor_day_off",
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn("DATE", Sequelize.col("appointment_datetime")),
          dayOff.off_date
        ),
      ],
    };

    // Thêm điều kiện lọc theo thời gian
    if (time_off === "morning") {
      whereClause[Op.and].push(
        Sequelize.where(
          Sequelize.fn(
            "TIME",
            Sequelize.fn(
              "CONVERT_TZ",
              Sequelize.col("appointment_datetime"),
              "+00:00",
              "+07:00"
            )
          ),
          {
            [Op.between]: ["08:00:00", "11:30:00"],
          }
        )
      );
    } else if (time_off === "afternoon") {
      whereClause[Op.and].push(
        Sequelize.where(
          Sequelize.fn(
            "TIME",
            Sequelize.fn(
              "CONVERT_TZ",
              Sequelize.col("appointment_datetime"),
              "+00:00",
              "+07:00"
            )
          ),
          {
            [Op.between]: ["13:30:00", "17:00:00"],
          }
        )
      );
    }

    const affectedAppointments = await db.Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: db.Patient,
          as: "Patient",
          attributes: ["phone_number"],
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["email", "username"],
            },
          ],
        },
      ],
      transaction: t,
    });

    // 6. Cập nhật trạng thái ngày nghỉ
    const updateData = {};
    if (time_off === "morning") {
      updateData.off_morning = false;
    } else if (time_off === "afternoon") {
      updateData.off_afternoon = false;
    } else {
      updateData.status = "cancelled";
    }

    // Nếu cả hai buổi đều false thì đánh dấu là đã hủy
    if (
      time_off !== "full" &&
      ((time_off === "morning" && !dayOff.off_afternoon) ||
        (time_off === "afternoon" && !dayOff.off_morning))
    ) {
      updateData.status = "cancelled";
    }

    await dayOff.update(updateData, { transaction: t });

    // 7. Khôi phục trạng thái lịch hẹn
    if (affectedAppointments.length > 0) {
      await db.Appointment.update(
        { status: "waiting_for_confirmation" },
        {
          where: {
            appointment_id: affectedAppointments.map(
              (apt) => apt.appointment_id
            ),
          },
          transaction: t,
        }
      );
    }

    await t.commit();

    return {
      success: true,
      message: "Hủy ngày nghỉ thành công",
      data: {
        day_off: dayOff,
        affected_appointments:
          affectedAppointments.length > 0
            ? affectedAppointments.map((apt) => ({
                id: apt.appointment_id,
                datetime: dayjs(apt.appointment_datetime)
                  .tz("Asia/Ho_Chi_Minh")
                  .format("YYYY-MM-DDTHH:mm:ssZ"),
                patient_name:
                  apt.Patient?.user?.username || "Không có thông tin",
                patient_phone:
                  apt.Patient?.phone_number || "Không có số điện thoại",
                patient_email: apt.Patient?.user?.email || "Không có email",
              }))
            : [],
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Xác nhận lịch hẹn
 * @param {number} appointment_id - ID của lịch hẹn
 * @param {number} doctor_id - ID của bác sĩ
 * @returns {Promise<Object>} - Thông tin về lịch hẹn đã xác nhận
 */
export const acceptAppointment = async (appointment_id, doctor_id) => {
  // Kiểm tra xem lịch hẹn có tồn tại không
  const appointment = await db.Appointment.findOne({
    where: {
      appointment_id,
      doctor_id,
    },
    include: [
      {
        model: db.FamilyMember,
        as: "FamilyMember",
        // include: [
        //   {
        //     model: db.User,
        //     as: "user",
        //     attributes: ["email", "username"],
        //   },
        // ],
      },
    ],
  });

  if (!appointment) {
    throw new NotFoundError(
      "Không tìm thấy lịch hẹn hoặc lịch hẹn không thuộc về bác sĩ này"
    );
  }

  // Kiểm tra trạng thái lịch hẹn
  const invalidStatuses = [
    "accepted",
    "completed",
    "cancelled",
    "doctor_day_off",
    "patient_not_coming",
  ];
  if (invalidStatuses.includes(appointment.status)) {
    throw new BadRequestError(
      `Không thể chấp nhận lịch hẹn đã ${
        appointment.status === "accepted"
          ? "được chấp nhận"
          : appointment.status === "completed"
          ? "hoàn thành"
          : appointment.status === "cancelled"
          ? "bị hủy"
          : appointment.status === "doctor_day_off"
          ? "bị nghỉ"
          : "được đánh dấu bệnh nhân không đến"
      }`
    );
  }

  // Chuyển đổi thời gian về múi giờ Việt Nam
  const appointmentTime = dayjs(appointment.appointment_datetime).tz(
    "Asia/Ho_Chi_Minh"
  );
  const now = dayjs().tz("Asia/Ho_Chi_Minh");

  // Kiểm tra xem thời gian hẹn đã qua chưa
  if (appointmentTime.isBefore(now)) {
    throw new BadRequestError("Không thể chấp nhận lịch hẹn đã qua");
  }

  // Kiểm tra xem đã có lịch hẹn nào được chấp nhận trong cùng khung giờ chưa
  const existingAcceptedAppointment = await db.Appointment.findOne({
    where: {
      doctor_id,
      appointment_datetime: appointment.appointment_datetime,
      status: "accepted",
      appointment_id: {
        [Op.ne]: appointment_id,
      },
    },
  });

  if (existingAcceptedAppointment) {
    throw new BadRequestError(
      "Đã có lịch hẹn khác được chấp nhận trong khung giờ này"
    );
  }

  // Tìm tất cả các lịch hẹn khác trong cùng khung giờ đang ở trạng thái waiting_for_confirmation
  const conflictingAppointments = await db.Appointment.findAll({
    where: {
      doctor_id,
      appointment_datetime: appointment.appointment_datetime,
      status: "waiting_for_confirmation",
      appointment_id: {
        [Op.ne]: appointment_id,
      },
    },
    include: [
      {
        model: db.FamilyMember,
        as: "FamilyMember",
        // include: [
        //   {
        //     model: db.User,
        //     as: "user",
        //     attributes: ["email", "username"],
        //   },
        // ],
      },
    ],
  });

  // Hủy tất cả các lịch hẹn trùng giờ
  if (conflictingAppointments.length > 0) {
    await Promise.all(
      conflictingAppointments.map(async (conflictAppointment) => {
        await conflictAppointment.update({
          status: "cancelled",
          cancelled_at: now.toDate(),
          cancelled_by: "system",
          cancel_reason:
            "Bác sĩ đã chấp nhận một lịch hẹn khác trong cùng khung giờ",
        });

        // TODO: Gửi email thông báo cho bệnh nhân bị hủy lịch
        // const emailInfo = {
        //   to: conflictAppointment.Patient.user.email,
        //   subject: "Thông báo hủy lịch hẹn",
        //   patientName: conflictAppointment.Patient.user.username,
        //   appointmentDate: appointmentTime.format("DD/MM/YYYY HH:mm"),
        //   reason: "Bác sĩ đã chấp nhận một lịch hẹn khác trong cùng khung giờ",
        // };
        // await sendEmailNotification(emailInfo);
      })
    );
  }

  // Chấp nhận lịch hẹn được chọn
  await appointment.update({
    status: "accepted",
  });

  // Gửi email thông báo cho bệnh nhân được chấp nhận
  // const emailInfo = {
  //   to: appointment.Patient.user.email,
  //   subject: "Thông báo chấp nhận lịch hẹn",
  //   patientName: appointment.Patient.user.username,
  //   appointmentDate: appointmentTime.format("DD/MM/YYYY HH:mm"),
  // };
  // await sendEmailNotification(emailInfo);

  return {
    success: true,
    message: "Đã chấp nhận lịch hẹn thành công",
    data: {
      appointment_id: appointment.appointment_id,
      family_member_name: appointment.FamilyMember.username,
      family_member_email: appointment.FamilyMember.email,
      appointment_datetime: appointmentTime.format("YYYY-MM-DDTHH:mm:ssZ"),
      status: "accepted",
      cancelled_appointments: conflictingAppointments.map((app) => ({
        appointment_id: app.appointment_id,
        family_member_name: app.FamilyMember.username,
        family_member_email: app.FamilyMember.email,
        status: "cancelled",
      })),
    },
  };
};

export const createMedicalRecord = async (
  doctor_id,
  appointment_id,
  { diagnosis, treatment, notes }
) => {
  // Lấy thông tin lịch hẹn
  const appointment = await db.Appointment.findOne({
    where: { appointment_id },
    include: {
      model: db.FamilyMember,
      as: "FamilyMember",
    },
  });

  if (!appointment) {
    throw new NotFoundError("Lịch hẹn không tồn tại");
  }

  // Kiểm tra bác sĩ có quyền tạo hồ sơ cho lịch hẹn này
  if (appointment.doctor_id !== doctor_id) {
    throw new ForbiddenError("Bạn không có quyền tạo hồ sơ cho lịch hẹn này");
  }

  // Kiểm tra trạng thái lịch hẹn có phải là 'accepted' (đã khám)
  if (appointment.status !== "accepted") {
    throw new BadRequestError(
      "Chỉ có thể tạo hồ sơ bệnh án sau khi lịch hẹn đã được chấp nhận"
    );
  }

  // Kiểm tra xem đã có hồ sơ bệnh án cho lịch hẹn này chưa
  const existingRecord = await db.MedicalRecord.findOne({
    where: {
      appointment_id,
      [Op.or]: [
        { completed_at: { [Op.not]: null } },
        { completed_by: { [Op.not]: null } },
      ],
    },
  });

  if (existingRecord) {
    throw new BadRequestError("Đã có hồ sơ bệnh án cho lịch hẹn này");
  }

  // Validate dữ liệu đầu vào
  if (!diagnosis || !treatment) {
    throw new BadRequestError(
      "Thiếu thông tin chẩn đoán hoặc phương pháp điều trị"
    );
  }

  // Tạo hồ sơ bệnh án
  const medicalRecord = await db.MedicalRecord.create({
    appointment_id,
    family_member_id: appointment.family_member_id,
    doctor_id,
    diagnosis,
    treatment,
    notes: notes || null,
    is_visible_to_patient: false,
    completed_at: new Date(),
    completed_by: doctor_id,
    viewed_at: null,
  });

  return {
    success: true,
    message:
      "Tạo hồ sơ bệnh án thành công. Bệnh nhân cần thanh toán để xem kết quả.",
    data: {
      record_id: medicalRecord.record_id,
      diagnosis: medicalRecord.diagnosis,
      treatment: medicalRecord.treatment,
      notes: medicalRecord.notes,
      created_at: medicalRecord.createdAt,
    },
  };
};

export const createPrescriptions = async (
  appointment_id,
  doctor_id,
  note,
  medicines,
  use_hospital_pharmacy
) => {
  console.log(appointment_id, doctor_id);
  // Kiểm tra cuộc hẹn
  const appointment = await db.Appointment.findOne({
    where: {
      appointment_id,
      doctor_id,
    },
    include: [
      {
        model: db.Doctor,
        as: "Doctor",
        include: {
          model: db.Specialization,
          as: "Specialization",
        },
      },
      {
        model: db.FamilyMember, // Ensure the patient is included
        as: "FamilyMember",
      },
    ],
  });

  if (!appointment) {
    throw new NotFoundError(
      "Cuộc hẹn không tồn tại hoặc không thuộc về bác sĩ này"
    );
  }

  if (appointment.status !== "accepted") {
    throw new BadRequestError(
      "Chỉ được tạo đơn thuốc cho cuộc hẹn đã được tiếp nhận"
    );
  }

  // Kiểm tra xem đã có đơn thuốc chưa
  const existingPrescription = await db.Prescription.findOne({
    where: { appointment_id },
  });

  if (existingPrescription) {
    throw new BadRequestError("Cuộc hẹn này đã có đơn thuốc");
  }

  // Lấy thông tin các thuốc
  const medicineIds = medicines.map((m) => m.medicine_id);
  const medicineList = await db.Medicine.findAll({
    where: {
      medicine_id: {
        [Op.in]: medicineIds,
      },
    },
  });

  if (medicineList.length !== medicineIds.length) {
    throw new BadRequestError("Một số thuốc không tồn tại trong hệ thống");
  }

  // Tạo đơn thuốc
  const prescription = await db.Prescription.create({
    appointment_id,
    // family_member_id: appointment.family_member_id, // Ensure the patient_id is passed
    note: note || null,
    created_by: doctor_id,
    status: "pending_prepare", // Đơn thuốc bắt đầu ở trạng thái chuẩn bị
    use_hospital_pharmacy,
    createdAt: new Date(),
  });

  // Tạo chi tiết đơn thuốc
  const prescriptionMedicines = [];

  for (const medicine of medicines) {
    const medicineInfo = medicineList.find(
      (m) => m.medicine_id === medicine.medicine_id
    );
    const total_price = medicineInfo.price * medicine.quantity;

    const prescriptionMedicine = await db.PrescriptionMedicine.create({
      prescription_id: prescription.prescription_id,
      medicine_id: medicine.medicine_id,
      quantity: medicine.quantity,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      duration: medicine.duration,
      instructions: medicine.instructions,
      unit_price: medicineInfo.price,
      total_price: total_price,
      createdAt: new Date(),
    });

    prescriptionMedicines.push({
      medicine_id: medicine.medicine_id,
      name: medicineInfo.name,
      quantity: medicine.quantity,
      unit: medicineInfo.unit,
      price: medicineInfo.price,
      total: total_price,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      duration: medicine.duration,
      instructions: medicine.instructions,
    });
  }

  // Nếu không sử dụng nhà thuốc bệnh viện, tạo PDF ngay và cập nhật status thành 'completed'
  // if (!use_hospital_pharmacy) {
  //   const pdfUrl = await generatePrescriptionPDF(prescription.prescription_id);
  //   await prescription.update({ pdf_url: pdfUrl });
  //   await prescription.update({ status: "completed" }); // Đổi trạng thái thành 'completed'
  // } else {
  //   // Nếu sử dụng nhà thuốc bệnh viện, xử lý thanh toán ở đây
  //   // Ví dụ: Bạn có thể tạo payment ở đây nếu cần, hoặc giữ status là 'pending_prepare' nếu không có payment.
  //   // Lưu ý: Nếu có payment, không cập nhật thành 'completed' ở đây.
  // }

  // Trả về kết quả
  return {
    success: true,
    message: "Tạo đơn thuốc thành công",
    data: {
      prescription_id: prescription.prescription_id,
      appointment_id,
      status: prescription.status,
      note: prescription.note,
      medicines: prescriptionMedicines,
    },
  };
};

/**
 * Lấy danh sách thanh toán của các cuộc hẹn
 * @param {number} doctor_id - ID của bác sĩ
 * @param {Object} filters - Các bộ lọc (trạng thái, khoảng thời gian)
 * @param {number} page - Trang hiện tại
 * @param {number} limit - Số lượng item trên mỗi trang
 * @returns {Promise<Object>} - Danh sách thanh toán
 */
export const getAppointmentPayments = async (
  doctor_id,
  filters = {},
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const whereClause = {};
  const paymentWhereClause = {};

  // Lọc theo trạng thái thanh toán
  if (filters.payment_status) {
    paymentWhereClause.status = filters.payment_status;
  }

  // Lọc theo khoảng thời gian
  if (filters.date) {
    // Nếu có tham số date, lọc theo ngày cụ thể
    const targetDate = dayjs.tz(filters.date, "Asia/Ho_Chi_Minh");
    whereClause.appointment_datetime = {
      [Op.between]: [
        targetDate.startOf("day").toDate(),
        targetDate.endOf("day").toDate(),
      ],
    };
  } else if (filters.start_date || filters.end_date) {
    // Nếu không có date nhưng có start_date hoặc end_date, lọc theo khoảng thời gian
    whereClause.appointment_datetime = {};
    if (filters.start_date) {
      whereClause.appointment_datetime[Op.gte] = dayjs
        .tz(filters.start_date, "Asia/Ho_Chi_Minh")
        .startOf("day")
        .toDate();
    }
    if (filters.end_date) {
      whereClause.appointment_datetime[Op.lte] = dayjs
        .tz(filters.end_date, "Asia/Ho_Chi_Minh")
        .endOf("day")
        .toDate();
    }
  }

  // Lấy danh sách cuộc hẹn có thanh toán
  const { count, rows } = await db.Appointment.findAndCountAll({
    where: {
      ...whereClause,
      doctor_id,
    },
    include: [
      {
        model: db.FamilyMember,
        as: "FamilyMember",
        // include: {
        //   model: db.User,
        //   as: "user",
        //   attributes: ["username", "email"],
        // },
      },
      {
        model: db.Payment,
        as: "Payments",
        where: paymentWhereClause,
        required: true, // Luôn yêu cầu có thanh toán
        attributes: [
          "payment_id",
          "amount",
          "payment_method",
          "status",
          "createdAt",
        ],
      },
    ],
    order: [["appointment_datetime", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  // Format dữ liệu trả về
  const payments = rows.map((appointment) => ({
    appointment_id: appointment.appointment_id,
    appointment_datetime: dayjs(appointment.appointment_datetime)
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DD HH:mm:ss"),
    patient: {
      name: appointment.FamilyMemberusername || "",
      email: appointment.FamilyMember.email || "",
    },
    payment: appointment.Payments
      ? {
          id: appointment.Payments.payment_id,
          amount: appointment.Payments.amount
            ? `${appointment.Payments.amount.toLocaleString("vi-VN")} VNĐ`
            : "0 VNĐ",
          status: appointment.Payments.status,
          payment_method: appointment.Payments.payment_method,
          payment_date: dayjs(appointment.Payments.createdAt)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD HH:mm:ss"),
        }
      : null,
  }));

  return {
    success: true,
    message: "Lấy danh sách thanh toán thành công",
    data: {
      payments,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_records: count,
        per_page: limit,
      },
    },
  };
};

/**
 * Cập nhật trạng thái thanh toán
 * @param {number} doctor_id - ID của bác sĩ
 * @param {number} payment_id - ID của thanh toán
 * @param {string} status - Trạng thái mới
 * @param {string} note - Ghi chú (nếu có)
 * @returns {Promise<Object>} - Thông tin thanh toán đã cập nhật
 */
export const updatePaymentStatus = async (
  doctor_id,
  payment_id,
  status,
  note = ""
) => {
  const t = await db.sequelize.transaction();

  try {
    // Kiểm tra thanh toán tồn tại và thuộc về bác sĩ
    const payment = await db.Payment.findOne({
      where: { payment_id },
      include: [
        {
          model: db.Appointment,
          as: "Appointment",
          where: { doctor_id },
          required: true,
        },
      ],
      transaction: t,
    });

    if (!payment) {
      throw new NotFoundError(
        "Không tìm thấy thanh toán hoặc thanh toán không thuộc về bác sĩ này"
      );
    }

    // Kiểm tra trạng thái hợp lệ
    const validStatuses = ["paid", "pending", "cancel"];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError("Trạng thái thanh toán không hợp lệ");
    }

    // Cập nhật trạng thái thanh toán
    await payment.update(
      {
        status,
        note: note || payment.note,
      },
      { transaction: t }
    );

    await t.commit();

    return {
      success: true,
      message: "Cập nhật trạng thái thanh toán thành công",
      data: {
        payment_id: payment.payment_id,
        appointment_id: payment.appointment_id,
        amount: `${payment.amount.toLocaleString("vi-VN")} VNĐ`,
        status: payment.status,
        payment_method: payment.payment_method,
        payment_date: dayjs(payment.createdAt)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD HH:mm:ss"),
        note: payment.note,
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};
export const getAllMedicines = async ({ search, expiry_before }) => {
  const whereClause = {};

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { supplier: { [Op.like]: `%${search}%` } },
    ];
  }

  if (expiry_before) {
    whereClause.expiry_date = { [Op.lte]: new Date(expiry_before) };
  }

  const { count, rows } = await Medicine.findAndCountAll({
    where: whereClause,
    order: [["name", "ASC"]],
  });

  const formattedMedicines = rows.map((med) => ({
    ...med.toJSON(),
    status_message: med.is_out_of_stock ? "Tạm hết hàng" : "",
  }));

  return {
    message:
      count > 0 ? "Lấy danh sách thuốc thành công" : "Không tìm thấy thuốc nào",
    medicines: formattedMedicines,
    totalRecords: count,
  };
};

export const getAllPatient_FamilyMember = async (
  doctor_id,
  { search, page = 1, limit = 10 }
) => {
  const offset = (page - 1) * limit;

  // 1) điều kiện cho Appointment
  const appointmentWhere = {
    doctor_id,
    status: { [Op.in]: ["accepted", "completed"] },
  };

  // 2) điều kiện tìm kiếm trên FamilyMember
  const familyWhere = {};
  if (search) {
    familyWhere[Op.or] = [
      { username: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone_number: { [Op.like]: `%${search}%` } },
      { gender: { [Op.like]: `%${search}%` } },
    ];
  }

  // 3) đếm tổng số bệnh nhân (distinct family_member_id)
  const totalDistinct = await db.Appointment.count({
    where: appointmentWhere,
    include: [
      {
        model: db.FamilyMember,
        as: "FamilyMember",
        where: familyWhere,
        attributes: [],
      },
    ],
    distinct: true,
    col: "family_member_id",
  });

  // nếu không có thì trả về luôn
  if (totalDistinct === 0) {
    return {
      success: true,
      message: "Không tìm thấy bệnh nhân nào",
      data: [],
      pagination: {
        total: 0,
        current_page: page,
        total_pages: 0,
        per_page: limit,
      },
    };
  }

  // 4) lấy danh sách family_member_id kèm last_appointment
  const rows = await db.Appointment.findAll({
    where: appointmentWhere,
    include: [
      {
        model: db.FamilyMember,
        as: "FamilyMember",
        where: familyWhere,
        attributes: [],
      },
    ],
    attributes: [
      "family_member_id",
      [fn("MAX", col("appointment_datetime")), "last_appointment"],
    ],
    group: ["family_member_id"],
    order: [[literal("last_appointment"), "DESC"]],
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    raw: true,
  });

  const familyIds = rows.map((r) => r.family_member_id);

  // 5) lấy chi tiết tất cả family member
  const members = await db.FamilyMember.findAll({
    where: { family_member_id: { [Op.in]: familyIds } },
  });

  // 6) ghép last_appointment vào từng record
  const data = members.map((m) => {
    const info = rows.find((r) => r.family_member_id === m.family_member_id);
    return {
      family_member_id: m.family_member_id,
      username: m.username,
      email: m.email,
      phone_number: m.phone_number,
      gender: m.gender,
      date_of_birth: m.date_of_birth,
      // relationship:     m.relationship,
      last_appointment: info?.last_appointment,
    };
  });

  return {
    success: true,
    message: "Lấy danh sách bệnh nhân thành công",
    data,
    pagination: {
      total: totalDistinct,
      current_page: page,
      total_pages: Math.ceil(totalDistinct / limit),
      per_page: limit,
    },
  };
};

export const getPatientAppointment = async (
  doctor_id,
  family_member_id,
  { status, start_date, end_date, page = 1, limit = 10 }
) => {
  try {
    const offset = (page - 1) * limit;

    // Xây dựng điều kiện tìm kiếm
    let whereCondition = {
      doctor_id,
      family_member_id,
    };

    // Áp dụng lọc theo trạng thái nếu có
    if (status) {
      whereCondition.status = status;
    }

    // Áp dụng lọc theo khoảng thời gian nếu có
    if (start_date || end_date) {
      whereCondition.appointment_datetime = {};

      if (start_date) {
        whereCondition.appointment_datetime[Op.gte] = dayjs(start_date)
          .startOf("day")
          .toDate();
      }

      if (end_date) {
        whereCondition.appointment_datetime[Op.lte] = dayjs(end_date)
          .endOf("day")
          .toDate();
      }
    }

    // Đếm tổng số cuộc hẹn
    const totalAppointments = await db.Appointment.count({
      where: whereCondition,
    });

    // Kiểm tra và lấy danh sách lịch hẹn
    const appointments = await db.Appointment.findAll({
      where: whereCondition,
      include: [
        {
          model: db.FamilyMember,
          as: "FamilyMember",
          attributes: ["username", "email", "phone_number", "gender"],
        },
        {
          model: db.Doctor,
          as: "Doctor",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["user_id", "username"],
            },
            {
              model: db.Specialization,
              as: "Specialization",
              attributes: ["name"],
            },
          ],
        },
        {
          model: db.MedicalRecord,
          as: "MedicalRecord",
          required: false,
        },
        {
          model: db.Prescription,
          as: "Prescription",
          required: false,
        },
        {
          model: db.Payment,
          as: "Payments",
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [["appointment_datetime", "DESC"]], // Sắp xếp theo thời gian hẹn
    });

    if (appointments.length === 0) {
      return {
        success: true,
        message: "Không tìm thấy lịch hẹn của bệnh nhân này",
        data: [],
        pagination: {
          total: 0,
          current_page: parseInt(page),
          total_pages: 0,
          per_page: parseInt(limit),
        },
      };
    }

    // Trả về thông tin các cuộc hẹn của bệnh nhân
    const familyMemberAppointments = appointments.map((appointment) => ({
      appointment_id: appointment.appointment_id,
      doctor_name: appointment.Doctor.user.username,
      specialization: appointment.Doctor.Specialization.name,
      appointment_datetime: appointment.appointment_datetime,
      status: appointment.status,
      fees: appointment.fees,
      symptoms: appointment.symptoms,
      medical_record_id: appointment.MedicalRecord?.record_id,
      prescription_id: appointment.Prescription?.prescription_id,
      payment_id: appointment.Payments?.payment_id,
      payment_status: appointment.Payments?.status,
      cancelled_at: appointment.cancelled_at,
      cancelled_by: appointment.cancelled_by,
      cancel_reason: appointment.cancel_reason,
    }));

    return {
      success: true,
      message: "Lấy danh sách cuộc hẹn của bệnh nhân thành công",
      data: familyMemberAppointments,
      pagination: {
        total: totalAppointments,
        current_page: parseInt(page),
        total_pages: Math.ceil(totalAppointments / limit),
        per_page: parseInt(limit),
      },
    };
  } catch (error) {
    console.error("Error fetching appointments for patient:", error);
    throw new Error("Có lỗi xảy ra khi lấy danh sách cuộc hẹn của bệnh nhân");
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
            { model: Specialization, as: "Specialization" },
            { model: Schedule, as: "Schedule" },
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

    // Thêm thông tin lịch làm việc cố định
    const workingHours = {
      weekdays: {
        days: "Thứ 2 - Thứ 6",
        morning: {
          start: "08:00",
          end: "11:30",
        },
        afternoon: {
          start: "13:30",
          end: "17:00",
        },
      },
      weekend: {
        days: "Thứ 7, Chủ nhật",
        status: "Nghỉ",
      },
    };

    return {
      message: "Success",
      user: {
        ...user.toJSON(),
        working_hours: workingHours,
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 * Lấy thông tin chi tiết của một FamilyMember
 */
export const getFamilyMemberDetails = async (doctor_id, family_member_id) => {
  // Kiểm tra xem bác sĩ có từng khám cho family member này chưa
  const hasAppointment = await Appointment.findOne({
    where: {
      doctor_id,
      family_member_id,
      status: { [Op.in]: ["accepted", "completed"] },
    },
  });

  if (!hasAppointment) {
    throw new NotFoundError("Không tìm thấy thông tin bệnh nhân này");
  }

  // Lấy thông tin chi tiết
  const familyMember = await FamilyMember.findOne({
    where: { family_member_id },
    attributes: [
      "family_member_id",
      "username",
      "email",
      "phone_number",
      "gender",
      "date_of_birth",
      "relationship",
      "avatar",
    ],
  });

  if (!familyMember) {
    throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
  }

  // Lấy thống kê cuộc hẹn
  const appointmentStats = await Appointment.findAll({
    where: {
      doctor_id,
      family_member_id,
      status: { [Op.in]: ["accepted", "completed"] },
    },
    attributes: ["status", [fn("COUNT", col("appointment_id")), "count"]],
    group: ["status"],
  });

  // Lấy lịch sử bệnh án
  const medicalHistory = await MedicalRecord.findAll({
    where: {
      family_member_id,
    },
    include: [
      {
        model: Appointment,
        as: "Appointment",
        where: { doctor_id },
        attributes: ["appointment_datetime"],
      },
    ],
    order: [[col("Appointment.appointment_datetime"), "DESC"]],
    limit: 5,
  });

  // Lấy đơn thuốc gần đây
  const recentPrescriptions = await Prescription.findAll({
    include: [
      {
        model: Appointment,
        as: "Appointment",
        where: {
          doctor_id,
          family_member_id,
        },
        attributes: ["appointment_datetime"],
      },
      {
        model: PrescriptionMedicine,
        as: "prescriptionMedicines",
        include: [
          {
            model: Medicine,
            as: "Medicine",
            attributes: ["name"],
          },
        ],
      },
    ],
    order: [[col("Appointment.appointment_datetime"), "DESC"]],
    limit: 3,
  });

  return {
    success: true,
    message: "Lấy thông tin chi tiết bệnh nhân thành công",
    data: {
      patient_info: {
        ...familyMember.toJSON(),
        date_of_birth: dayjs(familyMember.date_of_birth).format("YYYY-MM-DD"),
      },
      stats: {
        total_visits: appointmentStats.reduce(
          (sum, stat) => sum + parseInt(stat.getDataValue("count")),
          0
        ),
        appointment_stats: appointmentStats.map((stat) => ({
          status: stat.status,
          count: parseInt(stat.getDataValue("count")),
        })),
      },
      medical_history: medicalHistory.map((record) => ({
        record_id: record.record_id,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        date: dayjs(record.Appointment.appointment_datetime).format(
          "YYYY-MM-DD"
        ),
      })),
      recent_prescriptions: recentPrescriptions.map((prescription) => ({
        prescription_id: prescription.prescription_id,
        date: dayjs(prescription.Appointment.appointment_datetime).format(
          "YYYY-MM-DD"
        ),
        medicines: prescription.prescriptionMedicines
          .map((pm) => pm.Medicine.name)
          .join(", "),
        status: prescription.status,
      })),
    },
  };
};

export const getPatientAppointments = async (userId, familyMemberId) => {
  // 1. Xác thực doctor
  const doctor = await Doctor.findOne({
    where: { user_id: userId },
    attributes: ["doctor_id"],
  });
  if (!doctor) {
    throw new NotFoundError("Không tìm thấy thông tin bác sĩ");
  }

  // 2. Kiểm tra familyMember có lịch hẹn với doctor này hay không
  const count = await Appointment.count({
    where: {
      doctor_id: doctor.doctor_id,
      family_member_id: familyMemberId,
    },
  });
  if (!count) {
    throw new ForbiddenError(
      "Bệnh nhân này chưa có lịch hẹn với bác sĩ của bạn"
    );
  }

  // 3. Lấy tất cả lịch hẹn đã hoàn thành và đã thanh toán
  const appointments = await Appointment.findAll({
    where: {
      family_member_id: familyMemberId,
      status: "completed",
    },
    order: [["appointment_datetime", "DESC"]],
    include: [
      {
        model: FamilyMember,
        as: "FamilyMember",
        attributes: [
          "family_member_id",
          "username",
          "date_of_birth",
          "gender",
          "email",
          "phone_number",
        ],
      },
      {
        model: Payment,
        as: "Payments",
        where: { status: "paid" },
        required: true, // Bắt buộc phải có payment và status là paid
      },
      {
        model: MedicalRecord,
        as: "MedicalRecord",
        attributes: ["record_id", "notes"],
      },
      {
        model: Prescription,
        as: "Prescription",
        attributes: ["prescription_id", "status"],
        include: [
          {
            model: PrescriptionMedicine,
            as: "prescriptionMedicines",
            attributes: [
              "prescription_medicine_id",
              "medicine_id",
              "quantity",
              "actual_quantity",
            ],
            include: [
              {
                model: Medicine,
                as: "Medicine",
                attributes: ["medicine_id", "name", "unit", "price"],
              },
            ],
          },
        ],
      },
    ],
  });

  return appointments;
};
