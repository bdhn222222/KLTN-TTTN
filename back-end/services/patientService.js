import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
import dayjs from "dayjs";
import { Op } from "sequelize";
import sequelize from "sequelize";
import utc from 'dayjs/plugin/utc.js';  // Sử dụng phần mở rộng .js
import timezone from 'dayjs/plugin/timezone.js';  // Sử dụng phần mở rộng .js
import CompensationCode from '../models/compensationCode.js';
import { Model, DataTypes } from "sequelize";
import ForbiddenError from "../errors/forbidden.js";

// Kích hoạt các plugin
dayjs.extend(utc);
dayjs.extend(timezone);

// Ví dụ về sử dụng
const apptTime = dayjs('2025-04-29T16:00:00').tz('Asia/Ho_Chi_Minh', true);
console.log(apptTime.format());  // In ra thời gian đã chuyển đổi

const { User, Patient, MedicalRecord, Doctor, Payment } = db;

export const registerPatient = async ({
  username,
  email,
  password,
  date_of_birth,
  gender,
  phone_number,
  insurance_number,
  id_number,
}) => {
  const existingPatient = await User.findOne({ where: { email } });
  if (existingPatient) throw new BadRequestError("Email đã được đăng ký");
  // const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = await User.create({
    username,
    email,
    // password: hashedPassword,
    password,
    role: "patient",
  });
  const newPatient = await Patient.create({
    user_id: newUser.user_id,
    date_of_birth,
    gender,
    phone_number,
    insurance_number,
    id_number,
    is_verified: false,
  });
  return {
    message: "Đăng ký account bệnh nhân thành công",
    patient: newPatient,
  };
};

export const loginPatient = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email, role: "patient" },
    include: { model: Patient, as: "patient" },
  });
  if (!user) {
    throw new NotFoundError("Bệnh nhân không tồn tại hoặc email không đúng");
  }
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
      date_of_birth: user.patient.date_of_birth,
      gender: user.patient.gender,
      address: user.patient.address,
      phone_number: user.patient.phone_number,
      insurance_number: user.patient.insurance_number,
      id_number: user.patient.id_number,
      is_verified: user.patient.is_verified,
    },
  };
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
        as: "specialization",
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
        as: "specialization",
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
export const bookAppointment = async (user_id, doctor_id, appointment_datetime) => {
  // 0. Lấy patient_id từ user_id
  const patient = await db.Patient.findOne({
    where: { user_id }
  });

  if (!patient) {
    throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
  }

  // 1. Kiểm tra bác sĩ tồn tại
  const doctor = await db.Doctor.findByPk(doctor_id, {
    include: [
      { model: db.Specialization, as: "specialization" },
      { model: db.Schedule, as: "schedule" },
      { 
        model: db.User,
        as: "user",
        attributes: ['username']
      }
    ],
  });
  if (!doctor) {
    throw new NotFoundError("Không tìm thấy bác sĩ");
  }

  // 2. Validate thời gian đặt lịch
  const apptTime = dayjs(appointment_datetime).tz('Asia/Ho_Chi_Minh'); // Chuyển múi giờ về múi giờ Việt Nam
  if (!apptTime.isValid()) {
    throw new BadRequestError("Thời gian không hợp lệ");
  }

  const now = dayjs().tz('Asia/Ho_Chi_Minh'); // Đảm bảo giờ hiện tại cũng được tính theo múi giờ Việt Nam
  if (apptTime.isBefore(now)) {
    throw new BadRequestError("Không thể đặt lịch trong quá khứ");
  }

  if (apptTime.diff(now, "hour") < 2) {
    throw new BadRequestError("Bạn phải đặt lịch trước ít nhất 2 tiếng");
  }

  // 3. Kiểm tra lịch làm việc của bác sĩ
  const weekdayNumber = apptTime.day();
  
  const weekdayMap = {
    0: 'sunday',
    1: 'monday', 
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
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
  const timeStr = appointment_datetime.split('T')[1];
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Kiểm tra xem thời gian có đúng là các mốc 30 phút không
  if (minutes !== 0 && minutes !== 30) {
    throw new BadRequestError("Thời gian đặt lịch phải là các mốc 30 phút (ví dụ: 8:00, 8:30, 9:00,...)");
  }

  // Tạo danh sách các ca làm việc hợp lệ
  const morningSlots = [];
  const afternoonSlots = [];

  // Ca sáng: 8:00 - 11:30
  for (let h = 8; h <= 11; h++) {
    for (let m of [0, 30]) {
      // Nếu là 11:30 thì bỏ qua
      if (h === 11 && m === 30) continue;
      morningSlots.push({ hours: h, minutes: m });
    }
  }

  // Ca chiều: 13:30 - 17:00
  for (let h = 13; h <= 17; h++) {
    for (let m of [0, 30]) {
      // Bỏ qua 13:00 và sau 17:00
      if ((h === 13 && m === 0) || (h === 17 && m === 30)) continue;
      afternoonSlots.push({ hours: h, minutes: m });
    }
  }

  // Kiểm tra xem thời gian đặt lịch có nằm trong các ca hợp lệ không
  const isValidSlot = [...morningSlots, ...afternoonSlots].some(
    slot => slot.hours === hours && slot.minutes === minutes
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
          [Op.and]: [
            { off_morning: true },
            { off_afternoon: true }
          ]
        },
        {
          [Op.and]: [
            { off_morning: true },
            sequelize.where(sequelize.literal('1'), '=', isMorning ? 1 : 0)
          ]
        },
        {
          [Op.and]: [
            { off_afternoon: true },
            sequelize.where(sequelize.literal('1'), '=', isMorning ? 0 : 1)
          ]
        }
      ]
    }
  });

  if (dayOff) {
    throw new BadRequestError("Bác sĩ đã đăng ký nghỉ vào thời gian này");
  }

  // 6. Kiểm tra xem có lịch hẹn nào trùng thời gian không
  const existingAppointment = await db.Appointment.findOne({
    where: {
      doctor_id,
      appointment_datetime,
      status: {
        [Op.in]: ['accepted', 'waiting_for_confirmation', 'doctor_day_off']
      }
    }
  });

  if (existingAppointment) {
    let errorMessage = "Không thể đặt lịch hẹn vào khung giờ này. ";
    switch (existingAppointment.status) {
      case 'accepted':
        errorMessage += "Bác sĩ đã có lịch hẹn khác.";
        break;
      case 'waiting_for_confirmation':
        errorMessage += "Đã có bệnh nhân khác đặt lịch và đang chờ xác nhận.";
        break;
      case 'doctor_day_off':
        errorMessage += "Bác sĩ đã đăng ký nghỉ vào thời gian này.";
        break;
    }
    throw new BadRequestError(errorMessage);
  }

  // 7. Tạo lịch hẹn mới
  const appointment = await db.Appointment.create({
    doctor_id,
    patient_id: patient.patient_id,
    appointment_datetime,
    status: "waiting_for_confirmation",
    fees: doctor.fees || 0
  });

  return {
    success: true,
    message: "Đặt lịch hẹn thành công",
    data: {
      appointment_id: appointment.appointment_id,
      doctor_name: doctor.user ? doctor.user.username : null,
      specialization: doctor.specialization ? doctor.specialization.name : null,
      appointment_datetime: apptTime.format('YYYY-MM-DDTHH:mm:ssZ'),
      status: appointment.status,
      fees: appointment.fees,
      createdAt: appointment.createdAt
    }
  };
};

export const viewMedicalRecord = async (patient_id, record_id) => {
  try {
    // Kiểm tra hồ sơ bệnh án tồn tại
    const medicalRecord = await MedicalRecord.findByPk(record_id, {
      include: [
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['doctor_id', 'full_name', 'specialization']
        }
      ]
    });

    if (!medicalRecord) {
      throw new Error('Hồ sơ bệnh án không tồn tại');
    }

    // Kiểm tra quyền truy cập
    if (medicalRecord.patient_id !== patient_id) {
      throw new Error('Bạn không có quyền xem hồ sơ bệnh án này');
    }

    // Kiểm tra trạng thái thanh toán
    const payment = await Payment.findOne({
      where: {
        appointment_id: medicalRecord.appointment_id,
        status: 'paid' // Chỉ chấp nhận thanh toán đã hoàn thành
      }
    });

    if (!payment) {
      // Kiểm tra xem có thanh toán nào đang chờ xử lý không
      const pendingPayment = await Payment.findOne({
        where: {
          appointment_id: medicalRecord.appointment_id,
          status: 'pending'
        }
      });

      if (pendingPayment) {
        throw new Error('Thanh toán của bạn đang được xử lý. Vui lòng đợi xác nhận thanh toán để xem hồ sơ bệnh án.');
      } else {
        throw new Error('Bạn cần thanh toán để xem hồ sơ bệnh án này');
      }
    }

    // Tạo PDF cho hồ sơ bệnh án
    const pdfBuffer = await generateMedicalRecordPDF(medicalRecord);

    // Cập nhật trạng thái đã xem
    await medicalRecord.update({
      is_visible_to_patient: true,
      viewed_at: new Date()
    });

    // Trả về thông tin hồ sơ và URL để tải PDF
    return {
      success: true,
      message: 'Xem hồ sơ bệnh án thành công',
      data: {
        record_id: medicalRecord.record_id,
        doctor: medicalRecord.doctor,
        diagnosis: medicalRecord.diagnosis,
        treatment: medicalRecord.treatment,
        notes: medicalRecord.notes,
        pdf_url: `/api/medical-records/${medicalRecord.record_id}/pdf`
      }
    };
  } catch (error) {
    console.error('Lỗi khi xem hồ sơ bệnh án:', error);
    throw error;
  }
};

// Hàm tạo file PDF từ hồ sơ bệnh án
const generateMedicalRecordPDF = async (medicalRecord) => {
  // Sử dụng thư viện PDF như PDFKit để tạo file PDF
  // Đây là phần giả định, bạn cần cài đặt thư viện và triển khai chi tiết
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();
  
  // Thêm nội dung vào PDF
  doc.fontSize(20).text('KẾT QUẢ KHÁM BỆNH', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(12).text(`Bác sĩ: ${medicalRecord.doctor.full_name}`);
  doc.text(`Ngày khám: ${new Date(medicalRecord.appointment_datetime).toLocaleDateString('vi-VN')}`);
  doc.moveDown();
  
  doc.fontSize(14).text('CHẨN ĐOÁN:', { underline: true });
  doc.fontSize(12).text(medicalRecord.diagnosis);
  doc.moveDown();
  
  doc.fontSize(14).text('PHƯƠNG PHÁP ĐIỀU TRỊ:', { underline: true });
  doc.fontSize(12).text(medicalRecord.treatment);
  doc.moveDown();
  
  if (medicalRecord.notes) {
    doc.fontSize(14).text('GHI CHÚ:', { underline: true });
    doc.fontSize(12).text(medicalRecord.notes);
  }
  
  // Thêm footer
  doc.fontSize(10).text('Tài liệu này được tạo tự động bởi hệ thống Booking Doctor', { align: 'center' });
  
  // Lưu PDF vào buffer
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
};