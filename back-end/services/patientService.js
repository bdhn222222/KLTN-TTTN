import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
import dayjs from "dayjs";
import { Op } from "sequelize";
import sequelize from "sequelize";
import utc from "dayjs/plugin/utc.js"; // Sử dụng phần mở rộng .js
import timezone from "dayjs/plugin/timezone.js"; // Sử dụng phần mở rộng .js
import { sendVerifyLink } from "../utils/gmail.js";
import CompensationCode from "../models/compensationCode.js";
import { Model, DataTypes } from "sequelize";
import ForbiddenError from "../errors/forbidden.js";

// Kích hoạt các plugin
dayjs.extend(utc);
dayjs.extend(timezone);

// Ví dụ về sử dụng
const apptTime = dayjs("2025-04-29T16:00:00").tz("Asia/Ho_Chi_Minh", true);
console.log(apptTime.format()); // In ra thời gian đã chuyển đổi

const { User, Patient, MedicalRecord, Doctor, Payment, FamilyMember } = db;

export const registerPatient = async ({
  username,
  email,
  password,
  date_of_birth,
  gender,
  phone_number,
  insurance_number,
  id_number,
  address,
}) => {
  const transaction = await db.sequelize.transaction();

  try {
    const existingPatient = await User.findOne({
      where: { email },
      transaction,
    });

    if (existingPatient) {
      throw new BadRequestError("Email đã được đăng ký");
    }

    // Hash password với bcrypt
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create(
      {
        username,
        email,
        password,
        role: "patient",
      },
      { transaction }
    );

    const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

    const patientData = {
      user_id: newUser.user_id,
      date_of_birth,
      gender,
      phone_number,
      insurance_number,
      id_number,
      address,
      is_verified: false,
      otp_code,
      otp_expiry,
    };

    const newPatient = await Patient.create(patientData, { transaction });

    const link = `${process.env.URL}/patient/verify?email=${email}&otp_code=${otp_code}`;
    await sendVerifyLink(email, link);

    await transaction.commit();

    return {
      message: "Đăng ký account bệnh nhân thành công",
      patient: newPatient,
    };
  } catch (error) {
    await transaction.rollback();

    if (error instanceof BadRequestError) {
      throw error;
    }

    if (error.name === "SequelizeValidationError") {
      throw new BadRequestError(error.message);
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      throw new BadRequestError("Email hoặc số điện thoại đã được sử dụng");
    }

    throw new Error(`Lỗi trong quá trình đăng ký: ${error.message}`);
  }
};

export const verifyEmail = async (email, otp_code) => {
  try {
    const user = await User.findOne({
      where: { email },
      include: [{ model: Patient, as: "Patient" }],
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const patient = user.Patient;
    if (!patient) throw new NotFoundError("Patient not found");

    if (patient.is_verified)
      throw new BadRequestError("Email already verified");
    if (patient.otp_code !== otp_code)
      throw new BadRequestError("Invalid OTP code");
    if (patient.otp_expiry < new Date())
      throw new BadRequestError("OTP code has expired");

    patient.is_verified = true;
    patient.otp_code = null;
    patient.otp_expiry = null;

    await patient.save();

    return {
      message: "Xác thực email thành công",
    };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      throw error;
    }
    throw new Error("Lỗi trong quá trình xác thực email: " + error.message);
  }
};

export const changePassword = async (user_id, oldPassword, newPassword) => {
  const transaction = await db.sequelize.transaction();
  try {
    const user = await db.User.findByPk(user_id, {
      include: [{ model: db.Patient, as: "Patient" }],
      transaction,
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const patient = user.Patient;
    if (!patient) {
      throw new NotFoundError("Patient not found");
    }

    if (!patient.is_verified) {
      const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
      const otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

      patient.otp_code = otp_code;
      patient.otp_expiry = otp_expiry;

      await patient.save({ transaction });

      const link = `${process.env.URL}/patient/verify?email=${user.email}&otp_code=${otp_code}`;
      await sendVerifyLink(user.email, link); // Gửi email xác thực mới

      await transaction.commit();
      return {
        message: "Email not verified. Verification link has been resent.",
      };
    }

    // So sánh mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestError("Incorrect password");
    }
    user.password = newPassword;
    await user.save({ transaction });

    await transaction.commit();
    return { message: "Success" };
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};

export const loginPatient = async ({ email, password }) => {
  try {
    const user = await db.User.findOne({
      where: { email, role: "patient" },
      include: [{ model: db.Patient, as: "Patient" }],
    });

    if (!user) {
      throw new NotFoundError("Bệnh nhân không tồn tại hoặc email không đúng");
    }

    const patient = user.Patient;
    if (!patient) {
      throw new NotFoundError("Thông tin bệnh nhân không tồn tại");
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError("Mật khẩu không chính xác");
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return {
      message: "Đăng nhập thành công",
      token,
      patient: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        role: user.role,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address,
        phone_number: patient.phone_number,
        insurance_number: patient.insurance_number,
        id_number: patient.id_number,
        is_verified: patient.is_verified,
      },
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
      throw error;
    }
    throw new Error(`Lỗi trong quá trình đăng nhập: ${error.message}`);
  }
};

export const getAllSpecializations = async () => {
  const specializations = await db.Specialization.findAll({
    attributes: ["specialization_id", "name", "image", "fees"],
    order: [["name", "ASC"]],
  });

  if (!specializations || specializations.length === 0) {
    throw new NotFoundError("Không có chuyên khoa nào");
  }

  return {
    success: true,
    message: "Lấy danh sách chuyên khoa thành công",
    data: specializations,
  };
};

export const getAllDoctors = async () => {
  const doctors = await db.Doctor.findAll({
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["username", "email", "avatar"],
      },
      {
        model: db.Specialization,
        as: "Specialization",
        attributes: ["specialization_id", "name", "fees", "image"],
      },
    ],
    attributes: [
      "doctor_id",
      "degree",
      "experience_years",
      "description",
      "rating",
    ],
    order: [["rating", "DESC"]],
  });

  if (!doctors || doctors.length === 0) {
    throw new NotFoundError("Không tìm thấy bác sĩ nào");
  }

  return {
    success: true,
    message: "Lấy danh sách bác sĩ thành công",
    data: doctors,
  };
};

export const getDoctorProfile = async (doctor_id) => {
  const doctor = await db.Doctor.findByPk(doctor_id, {
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["username", "email", "avatar"],
      },
      {
        model: db.Specialization,
        as: "Specialization",
        attributes: ["specialization_id", "name", "fees", "image"],
      },
      {
        model: db.Schedule,
        as: "schedule",
        attributes: {
          exclude: ["doctor_id", "createdAt", "updatedAt"],
        },
      },
    ],
    attributes: [
      "doctor_id",
      "degree",
      "experience_years",
      "description",
      "rating",
    ],
  });

  if (!doctor) {
    throw new NotFoundError("Không tìm thấy bác sĩ");
  }

  return {
    success: true,
    message: "Lấy thông tin bác sĩ thành công",
    data: doctor,
  };
};

export const bookDoctorAppointment = async (
  user_id,
  doctor_id,
  appointment_datetime,
  family_member_id = null,
  family_member_data = null
) => {
  // Bắt đầu transaction để đảm bảo tính toàn vẹn dữ liệu
  const transaction = await db.sequelize.transaction();

  try {
    // 0. Lấy patient_id từ user_id
    const patient = await db.Patient.findOne({
      where: { user_id },
      transaction,
    });

    if (!patient) {
      throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
    }

    // Nếu có family_member_id, kiểm tra xem người thân có thuộc về patient này không
    if (family_member_id) {
      const familyMember = await db.FamilyMember.findOne({
        where: {
          family_member_id,
          patient_id: patient.patient_id,
        },
        transaction,
      });

      if (!familyMember) {
        throw new BadRequestError(
          "Người thân không tồn tại hoặc không thuộc về bạn"
        );
      }

      // Kiểm tra và cập nhật thông tin FamilyMember nếu có sự khác biệt
      if (family_member_data) {
        const { username, dob, phone_number, gender } = family_member_data;
        const hasChanges =
          familyMember.username !== username ||
          familyMember.dob !== dob ||
          familyMember.phone_number !== phone_number ||
          familyMember.gender !== gender;

        if (hasChanges) {
          await db.FamilyMember.update(
            {
              username,
              dob,
              phone_number,
              gender,
            },
            {
              where: { family_member_id },
              transaction,
            }
          );
        }
      }
    }

    // 1. Kiểm tra bác sĩ tồn tại
    const doctor = await db.Doctor.findByPk(doctor_id, {
      include: [
        {
          model: db.Specialization,
          as: "Specialization",
          attributes: ["name", "fees"],
        },
        { model: db.Schedule, as: "Schedule" },
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
      transaction,
    });

    if (!doctor) {
      throw new NotFoundError("Không tìm thấy bác sĩ");
    }

    // 2. Validate thời gian đặt lịch
    const apptTime = dayjs(appointment_datetime).tz("Asia/Ho_Chi_Minh");
    if (!apptTime.isValid()) {
      throw new BadRequestError("Thời gian không hợp lệ");
    }

    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    if (apptTime.isBefore(now)) {
      throw new BadRequestError("Không thể đặt lịch trong quá khứ");
    }

    if (apptTime.diff(now, "hour") < 2) {
      throw new BadRequestError("Bạn phải đặt lịch trước ít nhất 2 tiếng");
    }

    // 3. Kiểm tra lịch làm việc của bác sĩ
    const weekdayNumber = apptTime.day();
    const weekdayMap = {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday",
      5: "friday",
      6: "saturday",
    };
    const weekday = weekdayMap[weekdayNumber];

    const schedule = doctor.schedule;
    if (schedule && schedule[weekday] === false) {
      throw new BadRequestError("Bác sĩ không làm việc vào ngày này");
    }

    if (weekdayNumber === 0 || weekdayNumber === 6) {
      throw new BadRequestError("Bác sĩ không làm việc vào thứ 7 và chủ nhật");
    }

    // 4. Kiểm tra thời gian làm việc của bác sĩ
    const timeStr = appointment_datetime.split("T")[1];
    const [hours, minutes] = timeStr.split(":").map(Number);

    if (minutes !== 0 && minutes !== 30) {
      throw new BadRequestError(
        "Thời gian đặt lịch phải là các mốc 30 phút (ví dụ: 8:00, 8:30, 9:00,...)"
      );
    }

    // Tạo danh sách các ca làm việc hợp lệ
    const morningSlots = [];
    const afternoonSlots = [];

    // Ca sáng: 8:00 - 11:30
    for (let h = 8; h <= 11; h++) {
      for (let m of [0, 30]) {
        if (h === 11 && m === 30) continue;
        morningSlots.push({ hours: h, minutes: m });
      }
    }

    // Ca chiều: 13:30 - 17:00
    for (let h = 13; h <= 17; h++) {
      for (let m of [0, 30]) {
        if ((h === 13 && m === 0) || (h === 17 && m === 30)) continue;
        afternoonSlots.push({ hours: h, minutes: m });
      }
    }

    const isValidSlot = [...morningSlots, ...afternoonSlots].some(
      (slot) => slot.hours === hours && slot.minutes === minutes
    );

    if (!isValidSlot) {
      throw new BadRequestError(
        "Thời gian không hợp lệ. Các ca sáng: 8:00-11:00 (mỗi 30 phút). Các ca chiều: 13:30-17:00 (mỗi 30 phút)"
      );
    }

    // 5. Kiểm tra ngày nghỉ của bác sĩ
    const appointmentDate = apptTime.format("YYYY-MM-DD");
    const isMorning = hours < 12;

    const dayOff = await db.DoctorDayOff.findOne({
      where: {
        doctor_id,
        off_date: appointmentDate,
        status: "active",
        [Op.or]: [
          {
            [Op.and]: [{ off_morning: true }, { off_afternoon: true }],
          },
          {
            [Op.and]: [
              { off_morning: true },
              sequelize.where(sequelize.literal("1"), "=", isMorning ? 1 : 0),
            ],
          },
          {
            [Op.and]: [
              { off_afternoon: true },
              sequelize.where(sequelize.literal("1"), "=", isMorning ? 0 : 1),
            ],
          },
        ],
      },
      transaction,
    });

    if (dayOff) {
      throw new BadRequestError("Bác sĩ đã đăng ký nghỉ vào thời gian này");
    }

    // 6. Kiểm tra xem bệnh nhân/người thân đã có lịch hẹn nào vào thời gian này chưa
    const existingPatientAppointment = await db.Appointment.findOne({
      where: {
        appointment_datetime,
        status: {
          [Op.in]: ["accepted", "waiting_for_confirmation"],
        },
        family_member_id: family_member_id || null,
      },
      transaction,
    });

    if (existingPatientAppointment) {
      throw new BadRequestError("Bạn đã có lịch hẹn khác vào thời gian này");
    }

    // 7. Kiểm tra xem bác sĩ đã có lịch hẹn nào vào thời gian này chưa
    const existingDoctorAppointment = await db.Appointment.findOne({
      where: {
        doctor_id,
        appointment_datetime,
        status: {
          [Op.in]: ["accepted", "waiting_for_confirmation", "doctor_day_off"],
        },
      },
      transaction,
    });

    if (existingDoctorAppointment) {
      let errorMessage = "Không thể đặt lịch hẹn vào khung giờ này. ";
      switch (existingDoctorAppointment.status) {
        case "accepted":
          errorMessage += "Bác sĩ đã có lịch hẹn khác.";
          break;
        case "waiting_for_confirmation":
          errorMessage += "Đã có bệnh nhân khác đặt lịch và đang chờ xác nhận.";
          break;
        case "doctor_day_off":
          errorMessage += "Bác sĩ đã đăng ký nghỉ vào thời gian này.";
          break;
      }
      throw new BadRequestError(errorMessage);
    }

    // 8. Tạo lịch hẹn mới
    const appointment = await db.Appointment.create(
      {
        doctor_id,
        family_member_id: family_member_id || null,
        appointment_datetime,
        status: "waiting_for_confirmation",
        fees: doctor.Specialization?.fees || 0,
      },
      { transaction }
    );

    // Commit transaction nếu mọi thứ thành công
    await transaction.commit();

    return {
      success: true,
      message: "Đặt lịch hẹn thành công",
      data: {
        appointment_id: appointment.appointment_id,
        doctor_name: doctor.user ? doctor.user.username : null,
        specialization: doctor.Specialization
          ? doctor.Specialization.name
          : null,
        appointment_datetime: apptTime.format("YYYY-MM-DDTHH:mm:ssZ"),
        status: appointment.status,
        fees: doctor.Specialization?.fees || 0,
        createdAt: appointment.createdAt,
        family_member_id: appointment.family_member_id,
      },
    };
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await transaction.rollback();
    throw error;
  }
};

export const viewMedicalRecord = async (patient_id, record_id) => {
  try {
    // Kiểm tra hồ sơ bệnh án tồn tại
    const medicalRecord = await MedicalRecord.findByPk(record_id, {
      include: [
        {
          model: Doctor,
          as: "doctor",
          attributes: ["doctor_id", "full_name", "specialization"],
        },
      ],
    });

    if (!medicalRecord) {
      throw new Error("Hồ sơ bệnh án không tồn tại");
    }

    // Kiểm tra quyền truy cập
    if (medicalRecord.patient_id !== patient_id) {
      throw new Error("Bạn không có quyền xem hồ sơ bệnh án này");
    }

    // Kiểm tra trạng thái thanh toán
    const payment = await Payment.findOne({
      where: {
        appointment_id: medicalRecord.appointment_id,
        status: "paid", // Chỉ chấp nhận thanh toán đã hoàn thành
      },
    });

    if (!payment) {
      // Kiểm tra xem có thanh toán nào đang chờ xử lý không
      const pendingPayment = await Payment.findOne({
        where: {
          appointment_id: medicalRecord.appointment_id,
          status: "pending",
        },
      });

      if (pendingPayment) {
        throw new Error(
          "Thanh toán của bạn đang được xử lý. Vui lòng đợi xác nhận thanh toán để xem hồ sơ bệnh án."
        );
      } else {
        throw new Error("Bạn cần thanh toán để xem hồ sơ bệnh án này");
      }
    }

    // Tạo PDF cho hồ sơ bệnh án
    const pdfBuffer = await generateMedicalRecordPDF(medicalRecord);

    // Cập nhật trạng thái đã xem
    await medicalRecord.update({
      is_visible_to_patient: true,
      viewed_at: new Date(),
    });

    // Trả về thông tin hồ sơ và URL để tải PDF
    return {
      success: true,
      message: "Xem hồ sơ bệnh án thành công",
      data: {
        record_id: medicalRecord.record_id,
        doctor: medicalRecord.doctor,
        diagnosis: medicalRecord.diagnosis,
        treatment: medicalRecord.treatment,
        notes: medicalRecord.notes,
        pdf_url: `/api/medical-records/${medicalRecord.record_id}/pdf`,
      },
    };
  } catch (error) {
    console.error("Lỗi khi xem hồ sơ bệnh án:", error);
    throw error;
  }
};

// Hàm tạo file PDF từ hồ sơ bệnh án
const generateMedicalRecordPDF = async (medicalRecord) => {
  // Sử dụng thư viện PDF như PDFKit để tạo file PDF
  // Đây là phần giả định, bạn cần cài đặt thư viện và triển khai chi tiết
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument();

  // Thêm nội dung vào PDF
  doc.fontSize(20).text("KẾT QUẢ KHÁM BỆNH", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Bác sĩ: ${medicalRecord.doctor.full_name}`);
  doc.text(
    `Ngày khám: ${new Date(
      medicalRecord.appointment_datetime
    ).toLocaleDateString("vi-VN")}`
  );
  doc.moveDown();

  doc.fontSize(14).text("CHẨN ĐOÁN:", { underline: true });
  doc.fontSize(12).text(medicalRecord.diagnosis);
  doc.moveDown();

  doc.fontSize(14).text("PHƯƠNG PHÁP ĐIỀU TRỊ:", { underline: true });
  doc.fontSize(12).text(medicalRecord.treatment);
  doc.moveDown();

  if (medicalRecord.notes) {
    doc.fontSize(14).text("GHI CHÚ:", { underline: true });
    doc.fontSize(12).text(medicalRecord.notes);
  }

  // Thêm footer
  doc
    .fontSize(10)
    .text("Tài liệu này được tạo tự động bởi hệ thống Booking Doctor", {
      align: "center",
    });

  // Lưu PDF vào buffer
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
};

export const getAllPrescriptions = async ({
  patient_id,
  start_date,
  end_date,
  payment_status,
  dispensed_status,
  page = 1,
  limit = 10,
}) => {
  const offset = (page - 1) * limit;
  const whereClause = {};
  const paymentWhereClause = {};

  // Lấy patient_id từ user_id
  const patient = await db.Patient.findOne({
    where: { user_id: patient_id },
  });

  if (!patient) {
    throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
  }

  // Lọc theo thời gian
  if (start_date || end_date) {
    whereClause.createdAt = {};
    if (start_date) {
      whereClause.createdAt[Op.gte] = dayjs
        .tz(start_date, "Asia/Ho_Chi_Minh")
        .startOf("day")
        .toDate();
    }
    if (end_date) {
      whereClause.createdAt[Op.lte] = dayjs
        .tz(end_date, "Asia/Ho_Chi_Minh")
        .endOf("day")
        .toDate();
    }
  }

  // Lọc theo trạng thái thanh toán
  if (payment_status) {
    paymentWhereClause.status = payment_status;
  }

  // Lọc theo trạng thái phát thuốc
  if (dispensed_status !== undefined) {
    whereClause.dispensed = dispensed_status;
  }

  const { count, rows } = await db.Prescription.findAndCountAll({
    include: [
      {
        model: db.Appointment,
        as: "appointment",
        where: { patient_id: patient.patient_id },
        attributes: ["appointment_id", "appointment_datetime", "status"],
        include: [
          {
            model: db.Doctor,
            as: "Doctor",
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["username", "email"],
              },
            ],
          },
        ],
      },
      {
        model: db.PrescriptionMedicine,
        as: "prescriptionMedicines",
        attributes: [
          "prescription_medicine_id",
          "medicine_id",
          "quantity",
          "actual_quantity",
          "dosage",
          "frequency",
          "duration",
          "instructions",
          "unit_price",
          "total_price",
        ],
        include: [
          {
            model: db.Medicine,
            as: "medicine",
            attributes: [
              "medicine_id",
              "name",
              "unit",
              "price",
              "is_out_of_stock",
            ],
          },
        ],
      },
      {
        model: db.PrescriptionPayment,
        as: "prescriptionPayments",
        where: paymentWhereClause,
        required: !!payment_status,
        attributes: [
          "prescription_payment_id",
          "amount",
          "status",
          "payment_method",
        ],
      },
    ],
    where: whereClause,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  const prescriptions = rows.map((prescription) => ({
    prescription_id: prescription.prescription_id,
    created_at: dayjs(prescription.createdAt)
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DD HH:mm:ss"),
    status: prescription.status,
    appointment: {
      appointment_id: prescription.appointment.appointment_id,
      datetime: dayjs(prescription.appointment.appointment_datetime)
        .tz("Asia/Ho_Chi_Minh")
        .format("YYYY-MM-DD HH:mm:ss"),
      status: prescription.appointment.status,
      doctor: {
        name: prescription.appointment.Doctor.user.username,
        email: prescription.appointment.Doctor.user.email,
      },
    },
    medicines: prescription.prescriptionMedicines.map((item) => ({
      prescription_medicine_id: item.prescription_medicine_id,
      medicine: {
        medicine_id: item.medicine.medicine_id,
        name: item.medicine.name,
        unit: item.medicine.unit,
        price: item.medicine.price
          ? `${item.medicine.price.toLocaleString("vi-VN")} VNĐ`
          : "0 VNĐ",
        status: item.medicine.is_out_of_stock ? "Tạm hết hàng" : "Còn hàng",
      },
      prescribed: {
        quantity: item.quantity || 0,
        dosage: item.dosage || "Chưa có thông tin",
        frequency: item.frequency || "Chưa có thông tin",
        duration: item.duration || "Chưa có thông tin",
        instructions: item.instructions || "Chưa có hướng dẫn",
        total_price: `${item.total_price.toLocaleString("vi-VN")} VNĐ`,
      },
      dispensed: {
        quantity: item.actual_quantity || null,
        note: item.note || null,
      },
    })),
    payment: prescription.prescriptionPayments
      ? {
          payment_id: prescription.prescriptionPayments.prescription_payment_id,
          amount: prescription.prescriptionPayments.amount
            ? `${prescription.prescriptionPayments.amount.toLocaleString(
                "vi-VN"
              )} VNĐ`
            : "0 VNĐ",
          status: prescription.prescriptionPayments.status,
          payment_method: prescription.prescriptionPayments.payment_method,
        }
      : null,
  }));

  return {
    success: true,
    message: "Lấy danh sách đơn thuốc thành công",
    data: {
      prescriptions,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_records: count,
        per_page: limit,
      },
    },
  };
};

export const updatePatientProfile = async (user_id, updateData) => {
  const transaction = await db.sequelize.transaction();
  try {
    const user = await User.findByPk(user_id, {
      attributes: { exclude: ["password"] },
      include: [{ model: Patient, as: "patient" }],
      transaction,
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { patient } = user;
    if (!patient) {
      throw new NotFoundError("Patient not found");
    }

    const userFields = ["username", "email"];
    let emailChanged = false;
    userFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        if (field === "email" && updateData.email !== user.email) {
          emailChanged = true;
        }
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

    const patientFields = [
      "date_of_birth",
      "gender",
      "address",
      "phone_number",
      "insurance_number",
      "id_number",
    ];

    patientFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        patient[field] = updateData[field];
      }
    });

    if (emailChanged) {
      const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
      const otp_expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

      patient.is_verified = false;
      patient.otp_code = otp_code;
      patient.otp_expiry = otp_expiry;
    }

    await user.save({ transaction });
    await patient.save({ transaction });

    if (emailChanged) {
      const link = `${process.env.URL}/patient/verify?email=${updateData.email}&otp_code=${patient.otp_code}`;
      await sendVerifyLink(updateData.email, link); // Gửi email xác thực mới
    }

    await transaction.commit();
    return { message: "Success" };
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};

// FamilyMember services
export const getFamilyMembers = async (user_id) => {
  // Bắt đầu một transaction mới
  const t = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await Patient.findOne({
      where: { user_id },
      transaction: t,
    });

    if (!patient) {
      throw new BadRequestError("Không tìm thấy thông tin bệnh nhân");
    }

    // Lấy danh sách người thân
    const familyMembers = await FamilyMember.findAll({
      where: { patient_id: patient.patient_id },
      transaction: t,
    });

    // Commit transaction nếu thành công
    await t.commit();

    return familyMembers;
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    throw error;
  }
};

export const addFamilyMember = async (
  user_id,
  { username, phone_number, email, gender, date_of_birth, relationship }
) => {
  // Bắt đầu một transaction mới
  const t = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await Patient.findOne({
      where: { user_id },
      transaction: t,
    });

    if (!patient) {
      throw new BadRequestError("Không tìm thấy thông tin bệnh nhân");
    }

    // Thêm thành viên gia đình
    const familyMember = await FamilyMember.create(
      {
        patient_id: patient.patient_id,
        username,
        phone_number,
        email,
        gender,
        date_of_birth,
        relationship,
      },
      { transaction: t }
    );

    // Commit transaction nếu thành công
    await t.commit();

    return familyMember;
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    throw error;
  }
};

export const updateFamilyMember = async (
  user_id,
  family_member_id,
  updates
) => {
  const t = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await Patient.findOne({
      where: { user_id },
      transaction: t,
    });

    if (!patient) {
      throw new BadRequestError("Không tìm thấy thông tin bệnh nhân");
    }

    // Kiểm tra xem FamilyMember có tồn tại và thuộc về patient này không
    const familyMember = await FamilyMember.findOne({
      where: {
        family_member_id,
        patient_id: patient.patient_id,
      },
      transaction: t,
    });

    if (!familyMember) {
      throw new NotFoundError("Không tìm thấy thành viên gia đình");
    }

    // Cập nhật thông tin thành viên gia đình
    await familyMember.update(updates, { transaction: t });

    // Commit transaction nếu thành công
    await t.commit();

    return familyMember;
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    throw error;
  }
};

export const deleteFamilyMember = async (user_id, family_member_id) => {
  const t = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await Patient.findOne({
      where: { user_id },
      transaction: t,
    });

    if (!patient) {
      throw new BadRequestError("Không tìm thấy thông tin bệnh nhân");
    }

    // Kiểm tra xem FamilyMember có tồn tại và thuộc về patient này không
    const familyMember = await FamilyMember.findOne({
      where: {
        family_member_id,
        patient_id: patient.patient_id,
      },
      transaction: t,
    });

    if (!familyMember) {
      throw new NotFoundError("Không tìm thấy thành viên gia đình");
    }

    await familyMember.destroy({ transaction: t });

    // Commit transaction nếu thành công
    await t.commit();

    return { message: "Xóa thành viên gia đình thành công" };
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    throw error;
  }
};

export const getAllAppointments = async (user_id, family_member_id = null) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await db.Patient.findOne({
      where: { user_id },
      transaction,
    });

    if (!patient) {
      throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
    }

    // Nếu có family_member_id, kiểm tra xem người thân có thuộc về patient này không
    if (family_member_id) {
      const familyMember = await db.FamilyMember.findOne({
        where: {
          family_member_id,
          patient_id: patient.patient_id,
        },
        transaction,
      });

      if (!familyMember) {
        throw new BadRequestError(
          "Người thân không tồn tại hoặc không thuộc về bạn"
        );
      }
    }

    // Lấy tất cả family_member_ids của patient
    const familyMembers = await db.FamilyMember.findAll({
      where: { patient_id: patient.patient_id },
      attributes: ["family_member_id"],
      transaction,
    });

    const familyMemberIds = familyMembers.map(
      (member) => member.family_member_id
    );

    // Lấy danh sách lịch hẹn
    const appointments = await db.Appointment.findAll({
      where: {
        [Op.or]: [
          { family_member_id: family_member_id || null },
          { family_member_id: { [Op.in]: familyMemberIds } },
        ],
      },
      include: [
        {
          model: db.Doctor,
          as: "doctor",
          include: [
            {
              model: db.Specialization,
              as: "Specialization",
              attributes: ["name", "fees"],
            },
            {
              model: db.User,
              as: "user",
              attributes: ["username"],
            },
          ],
        },
        {
          model: db.FamilyMember,
          as: "familyMember",
          attributes: ["name", "relationship"],
        },
      ],
      order: [["appointment_datetime", "DESC"]],
      transaction,
    });

    // Format dữ liệu trả về
    const formattedAppointments = appointments.map((appointment) => ({
      appointment_id: appointment.appointment_id,
      appointment_datetime: dayjs(appointment.appointment_datetime).format(
        "YYYY-MM-DDTHH:mm:ssZ"
      ),
      status: appointment.status,
      fees: appointment.fees,
      doctor: {
        doctor_id: appointment.doctor.doctor_id,
        name: appointment.doctor.user.username,
        specialization: appointment.doctor.Specialization.name,
      },
      family_member: appointment.familyMember
        ? {
            family_member_id: appointment.familyMember.family_member_id,
            name: appointment.familyMember.name,
            relationship: appointment.familyMember.relationship,
          }
        : null,
    }));

    await transaction.commit();

    return {
      success: true,
      message: "Lấy danh sách lịch hẹn thành công",
      data: formattedAppointments,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const bookSymptomsAppointment = async (
  user_id,
  symptoms,
  appointment_datetime,
  family_member_id = null,
  family_member_data = null
) => {
  // Khởi tạo transaction
  const transaction = await db.sequelize.transaction();
  let isCommitted = false;

  try {
    // Tìm thông tin bệnh nhân
    const patient = await db.Patient.findOne({
      where: { user_id },
      transaction,
    });

    if (!patient) {
      throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
    }

    // Xử lý thông tin người thân nếu có
    let familyMember = null;
    if (family_member_id) {
      // Kiểm tra và lấy thông tin người thân
      familyMember = await handleFamilyMemberData(
        family_member_id,
        patient.patient_id,
        family_member_data,
        transaction
      );
    }

    // Xác thực triệu chứng
    const symptomRecords = await validateSymptoms(symptoms, transaction);

    // Tính tuổi bệnh nhân
    const dob = familyMember ? familyMember.dob : patient.date_of_birth;
    console.log("Date of birth:", dob);

    // Sử dụng dayjs để tính tuổi chính xác
    const birthDate = dayjs(dob);
    const currentDate = dayjs();
    const age = currentDate.diff(birthDate, "year");

    console.log("Birth date:", birthDate.format("YYYY-MM-DD"));
    console.log("Current date:", currentDate.format("YYYY-MM-DD"));
    console.log("Calculated age:", age);
    console.log("Number of symptoms:", symptoms.length);

    // Phân loại chuyên khoa
    let specialization_id;
    let specialization_name;

    // Nếu bệnh nhân dưới 13 tuổi, LUÔN chọn Nhi khoa
    if (age < 13) {
      console.log("Patient is under 13, selecting Pediatrics");
      const pediatrics = await db.Specialization.findOne({
        where: { name: "Nhi" },
        transaction,
      });
      if (!pediatrics) {
        throw new NotFoundError("Không tìm thấy chuyên khoa Nhi khoa");
      }
      specialization_id = pediatrics.specialization_id;
      specialization_name = pediatrics.name;
    }
    // Nếu có 3 triệu chứng trở lên và bệnh nhân trên 13 tuổi, chọn Tổng hợp
    else if (symptoms.length >= 3) {
      console.log("Patient has 3 or more symptoms, selecting General");
      const general = await db.Specialization.findOne({
        where: { name: "Tổng hợp" },
        transaction,
      });
      if (!general) {
        throw new NotFoundError("Không tìm thấy chuyên khoa Tổng hợp");
      }
      specialization_id = general.specialization_id;
      specialization_name = general.name;
    } else {
      console.log(
        "Using frequency count algorithm for specialization selection"
      );
      // Áp dụng thuật toán Đếm Tần Suất
      const mappings = await db.SymptomSpecializationMapping.findAll({
        where: {
          symptom_id: {
            [Op.in]: symptoms,
          },
        },
        include: [
          {
            model: db.Specialization,
            as: "Specialization",
            attributes: ["name"],
          },
        ],
        transaction,
      });

      // Đếm tần suất xuất hiện của mỗi chuyên khoa
      const specializationCount = {};
      const specializationNames = {};

      mappings.forEach((mapping) => {
        specializationCount[mapping.specialization_id] =
          (specializationCount[mapping.specialization_id] || 0) + 1;
        if (mapping.Specialization) {
          specializationNames[mapping.specialization_id] =
            mapping.Specialization.name;
        }
      });

      // Sắp xếp theo tần suất giảm dần
      const sortedSpecializations = Object.entries(specializationCount).sort(
        (a, b) => b[1] - a[1]
      );

      if (sortedSpecializations.length === 0) {
        throw new NotFoundError("Không tìm thấy chuyên khoa phù hợp");
      }

      // Nếu có nhiều chuyên khoa cùng điểm hoặc triệu chứng có thể thuộc nhiều chuyên khoa
      if (
        sortedSpecializations.length > 1 &&
        sortedSpecializations[0][1] === sortedSpecializations[1][1]
      ) {
        // Chọn khoa Tổng hợp
        const general = await db.Specialization.findOne({
          where: { name: "Tổng hợp" },
          transaction,
        });
        if (!general) {
          throw new NotFoundError("Không tìm thấy chuyên khoa Tổng hợp");
        }
        specialization_id = general.specialization_id;
        specialization_name = general.name;
      } else {
        specialization_id = sortedSpecializations[0][0];
        specialization_name =
          specializationNames[specialization_id] || "Unknown";
      }
    }

    // Xác thực thời gian đặt lịch
    const apptTime = validateAppointmentTime(appointment_datetime);

    // Tìm bác sĩ phù hợp có lịch trống
    const selectedDoctor = await findAvailableDoctor(
      specialization_id,
      apptTime,
      appointment_datetime,
      transaction
    );

    // Kiểm tra xem bệnh nhân/người thân đã có lịch hẹn nào vào thời gian này chưa
    await checkExistingAppointment(
      appointment_datetime,
      family_member_id,
      transaction
    );

    // Tạo lịch hẹn mới
    const appointment = await db.Appointment.create(
      {
        doctor_id: selectedDoctor.doctor_id,
        family_member_id: family_member_id || null,
        appointment_datetime,
        status: "waiting_for_confirmation",
        fees: selectedDoctor.Specialization?.fees || 0,
      },
      { transaction }
    );

    // Commit transaction
    await transaction.commit();
    isCommitted = true;

    // Chuẩn bị dữ liệu phản hồi
    return prepareSuccessResponse(
      appointment,
      selectedDoctor,
      apptTime,
      symptomRecords,
      specialization_name,
      family_member_id,
      patient,
      family_member_data
    );
  } catch (error) {
    // Rollback nếu chưa commit
    if (!isCommitted) {
      await transaction.rollback();
    }
    throw error;
  }
};

// Xử lý và xác thực thông tin người thân
const handleFamilyMemberData = async (
  family_member_id,
  patient_id,
  family_member_data,
  transaction
) => {
  console.log("Xử lý thông tin người thân ID:", family_member_id);

  // Tìm thông tin người thân trong DB
  const familyMember = await db.FamilyMember.findOne({
    where: {
      family_member_id,
      patient_id,
    },
    transaction,
  });

  if (!familyMember) {
    throw new BadRequestError(
      "Người thân không tồn tại hoặc không thuộc về bạn"
    );
  }

  // Ánh xạ giữa date_of_birth và dob
  if (familyMember.date_of_birth) {
    familyMember.dob = familyMember.date_of_birth;
  }

  console.log("Dữ liệu người thân từ DB trước khi cập nhật:", {
    username: familyMember.username,
    dob: familyMember.dob || familyMember.date_of_birth,
    phone_number: familyMember.phone_number,
    gender: familyMember.gender,
  });

  // Cập nhật thông tin người thân nếu có
  if (family_member_data) {
    console.log(
      "Dữ liệu người thân từ request:",
      JSON.stringify(family_member_data)
    );

    // LUÔN cập nhật các trường có trong family_member_data
    if (family_member_data.username)
      familyMember.username = family_member_data.username;
    // Cập nhật cả dob và date_of_birth
    if (family_member_data.dob) {
      familyMember.dob = family_member_data.dob;
      familyMember.date_of_birth = family_member_data.dob;
    }
    if (family_member_data.phone_number)
      familyMember.phone_number = family_member_data.phone_number;
    if (family_member_data.gender)
      familyMember.gender = family_member_data.gender;

    // Lưu thay đổi vào database
    await familyMember.save({ transaction });

    console.log(
      "SQL Query được thực thi:",
      familyMember._previousDataValues,
      "->",
      familyMember.dataValues
    );
    console.log("Dữ liệu người thân sau khi cập nhật:", {
      username: familyMember.username,
      dob: familyMember.dob || familyMember.date_of_birth,
      phone_number: familyMember.phone_number,
      gender: familyMember.gender,
    });
  }

  return familyMember;
};

// Xác thực danh sách triệu chứng
const validateSymptoms = async (symptoms, transaction) => {
  const symptomRecords = await db.Symptom.findAll({
    where: {
      symptom_id: {
        [Op.in]: symptoms,
      },
    },
    transaction,
  });

  if (symptomRecords.length !== symptoms.length) {
    throw new BadRequestError(
      "Một số triệu chứng không tồn tại trong hệ thống"
    );
  }

  return symptomRecords;
};

// Xác thực thời gian đặt lịch
const validateAppointmentTime = (appointment_datetime) => {
  const apptTime = dayjs(appointment_datetime).tz("Asia/Ho_Chi_Minh");

  if (!apptTime.isValid()) {
    throw new BadRequestError("Thời gian không hợp lệ");
  }

  const now = dayjs().tz("Asia/Ho_Chi_Minh");

  if (apptTime.isBefore(now)) {
    throw new BadRequestError("Không thể đặt lịch trong quá khứ");
  }

  if (apptTime.diff(now, "hour") < 2) {
    throw new BadRequestError("Bạn phải đặt lịch trước ít nhất 2 tiếng");
  }

  // Kiểm tra định dạng thời gian
  const timeStr = appointment_datetime.split("T")[1];
  const [hours, minutes] = timeStr.split(":").map(Number);

  if (minutes !== 0 && minutes !== 30) {
    throw new BadRequestError(
      "Thời gian đặt lịch phải là đúng giờ hoặc nửa giờ (0 hoặc 30 phút)"
    );
  }

  // Kiểm tra ngày nghỉ cuối tuần
  const weekdayNumber = apptTime.day();
  if (weekdayNumber === 0 || weekdayNumber === 6) {
    throw new BadRequestError("Không thể đặt lịch vào ngày cuối tuần");
  }

  return apptTime;
};

// Tìm bác sĩ có lịch trống
const findAvailableDoctor = async (
  specialization_id,
  apptTime,
  appointment_datetime,
  transaction
) => {
  // Tìm tất cả bác sĩ thuộc chuyên khoa
  const doctors = await db.Doctor.findAll({
    where: { specialization_id },
    include: [
      {
        model: db.Specialization,
        as: "Specialization",
        attributes: ["name", "fees"],
      },
      { model: db.Schedule, as: "Schedule" },
      {
        model: db.User,
        as: "user",
        attributes: ["username"],
      },
    ],
    transaction,
  });

  if (doctors.length === 0) {
    throw new NotFoundError("Không tìm thấy bác sĩ phù hợp");
  }

  // Lấy thông số thời gian
  const appointmentDate = apptTime.format("YYYY-MM-DD");
  const timeStr = appointment_datetime.split("T")[1];
  const [hours, minutes] = timeStr.split(":").map(Number);
  const isMorning = hours < 12;
  const weekdayNumber = apptTime.day();
  const weekdayMap = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  const weekday = weekdayMap[weekdayNumber];

  // Tìm bác sĩ phù hợp với cân bằng tải - sử dụng truy vấn tối ưu
  const availableDoctors = [];

  for (const doctor of doctors) {
    // Kiểm tra lịch làm việc theo ngày trong tuần
    if (doctor.Schedule && doctor.Schedule[weekday] === false) {
      continue;
    }

    // Kiểm tra ngày nghỉ của bác sĩ
    const dayOff = await db.DoctorDayOff.findOne({
      where: {
        doctor_id: doctor.doctor_id,
        off_date: appointmentDate,
        status: "active",
        [Op.or]: [
          {
            [Op.and]: [{ off_morning: true }, { off_afternoon: true }],
          },
          {
            [Op.and]: [
              { off_morning: true },
              sequelize.where(sequelize.literal("1"), "=", isMorning ? 1 : 0),
            ],
          },
          {
            [Op.and]: [
              { off_afternoon: true },
              sequelize.where(sequelize.literal("1"), "=", isMorning ? 0 : 1),
            ],
          },
        ],
      },
      transaction,
    });

    if (dayOff) {
      continue;
    }

    // Kiểm tra lịch hẹn hiện có
    const existingAppointment = await db.Appointment.findOne({
      where: {
        doctor_id: doctor.doctor_id,
        appointment_datetime,
        status: {
          [Op.in]: ["accepted", "waiting_for_confirmation", "doctor_day_off"],
        },
      },
      transaction,
    });

    if (!existingAppointment) {
      // Tìm tải công việc hiện tại của bác sĩ
      const currentWorkload = await db.Appointment.count({
        where: {
          doctor_id: doctor.doctor_id,
          appointment_datetime: {
            [Op.gte]: dayjs().format("YYYY-MM-DD"),
          },
          status: {
            [Op.in]: ["accepted", "waiting_for_confirmation"],
          },
        },
        transaction,
      });

      availableDoctors.push({
        doctor,
        workload: currentWorkload,
      });
    }
  }

  if (availableDoctors.length === 0) {
    throw new BadRequestError(
      "Không tìm thấy bác sĩ có lịch trống vào thời gian này"
    );
  }

  // Sắp xếp bác sĩ theo tải công việc thấp nhất (cân bằng tải)
  availableDoctors.sort((a, b) => a.workload - b.workload);

  return availableDoctors[0].doctor;
};

// Kiểm tra lịch hẹn trùng lặp
const checkExistingAppointment = async (
  appointment_datetime,
  family_member_id,
  transaction
) => {
  const existingPatientAppointment = await db.Appointment.findOne({
    where: {
      appointment_datetime,
      status: {
        [Op.in]: ["accepted", "waiting_for_confirmation"],
      },
      family_member_id: family_member_id || null,
    },
    transaction,
  });

  if (existingPatientAppointment) {
    throw new BadRequestError("Bạn đã có lịch hẹn khác vào thời gian này");
  }
};

// Chuẩn bị phản hồi thành công
const prepareSuccessResponse = (
  appointment,
  selectedDoctor,
  apptTime,
  symptomRecords,
  specialization_name,
  family_member_id,
  patient,
  family_member_data
) => {
  // Ghi log để debug
  console.log(
    "Selected doctor specialization:",
    selectedDoctor.Specialization?.name
  );
  console.log("Recommended specialization:", specialization_name);

  return {
    success: true,
    message: "Đặt lịch hẹn thành công",
    data: {
      appointment_id: appointment.appointment_id,
      doctor_name: selectedDoctor.user ? selectedDoctor.user.username : null,
      specialization: selectedDoctor.Specialization
        ? selectedDoctor.Specialization.name
        : null,
      appointment_datetime: apptTime.format("YYYY-MM-DDTHH:mm:ssZ"),
      status: appointment.status,
      fees: selectedDoctor.Specialization?.fees || 0,
      symptoms: symptomRecords.map((s) => s.name),
      recommended_specialization: specialization_name,
      patient: {
        patient_id: family_member_id ? family_member_id : patient.patient_id,
        full_name: family_member_data
          ? family_member_data.username
          : patient.full_name,
        date_of_birth: family_member_data
          ? family_member_data.dob
          : patient.date_of_birth,
        gender: family_member_data ? family_member_data.gender : patient.gender,
        phone_number: family_member_data
          ? family_member_data.phone_number
          : patient.phone_number,
        address: family_member_data
          ? family_member_data.address
          : patient.address,
        relationship: family_member_data
          ? family_member_data.relationship
          : null,
      },
    },
  };
};
