import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
import dayjs from "dayjs";
const { User, Patient } = db;
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
import dayjs from "dayjs";

export const bookAppointment = async (
  user_id,
  doctor_id,
  appointment_datetime
) => {
  const doctor = await db.Doctor.findByPk(doctor_id, {
    include: [
      { model: db.Specialization, as: "specialization" },
      { model: db.Schedule, as: "schedule" }, // 👈 include lịch làm việc
    ],
  });
  if (!doctor) throw new NotFoundError("Không tìm thấy bác sĩ");

  const apptTime = dayjs(appointment_datetime);
  if (!apptTime.isValid()) throw new BadRequestError("Thời gian không hợp lệ");
  if (apptTime.diff(dayjs(), "hour") < 2) {
    throw new BadRequestError("Bạn phải đặt lịch trước ít nhất 2 tiếng");
  }

  const weekday = apptTime.format("dddd").toLowerCase(); // "monday" → "sunday"

  const schedule = doctor.schedule;
  if (!schedule || schedule[weekday] !== true) {
    throw new BadRequestError("Bác sĩ không làm việc vào ngày này");
  }

  const isExist = await db.Appointment.findOne({
    where: {
      doctor_id,
      appointment_datetime,
    },
  });
  if (isExist) throw new BadRequestError("Khung giờ đã có người đặt");

  const patient = await db.Patient.findOne({ where: { user_id } });
  if (!patient) throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");

  const fees = doctor.specialization?.fees || 0;

  const newAppointment = await db.Appointment.create({
    patient_id: patient.patient_id,
    doctor_id,
    appointment_datetime,
    fees,
    status: "waiting_for_confirmation",
  });

  return {
    success: true,
    message: "Đặt lịch hẹn thành công",
    data: newAppointment,
  };
};
