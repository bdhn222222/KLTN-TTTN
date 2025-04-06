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

// Kích hoạt các plugin
dayjs.extend(utc);
dayjs.extend(timezone);

// Ví dụ về sử dụng
const apptTime = dayjs('2025-04-29T16:00:00').tz('Asia/Ho_Chi_Minh', true);
console.log(apptTime.format());  // In ra thời gian đã chuyển đổi

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

export const bookAppointment = async (user_id, doctor_id, appointment_datetime) => {
  // 1. Kiểm tra bác sĩ tồn tại
  const doctor = await db.Doctor.findByPk(doctor_id, {
    include: [
      { model: db.Specialization, as: "specialization" },
      { model: db.Schedule, as: "schedule" },
    ],
  });
  if (!doctor) {
    throw new NotFoundError("Không tìm thấy bác sĩ");
  }

  // 2. Validate thời gian đặt lịch
  const apptTime = dayjs(appointment_datetime).local(); // Chuyển múi giờ về múi giờ địa phương
  if (!apptTime.isValid()) {
    throw new BadRequestError("Thời gian không hợp lệ");
  }

  const now = dayjs().local(); // Đảm bảo giờ hiện tại cũng được tính theo múi giờ địa phương
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

  let isValidTime = false;
  // Kiểm tra buổi sáng từ 8:00 - 11:00
  if (hours >= 8 && hours < 11) {
    isValidTime = true;
  } else if (hours === 11 && minutes === 0) {
    isValidTime = true;
  }
  // Kiểm tra buổi chiều từ 13:30 - 17:00
  else if (hours > 13 && hours < 17) {
    isValidTime = true;
  } else if (hours === 13 && minutes >= 30) {
    isValidTime = true;
  } else if (hours === 17 && minutes === 0) {
    isValidTime = true;
  }

  if (!isValidTime) {
    if (hours < 12) {
      throw new BadRequestError("Thời gian làm việc buổi sáng: 8:00 - 11:00");
    } else {
      throw new BadRequestError("Thời gian làm việc buổi chiều: 13:30 - 17:00");
    }
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

  // 6. Kiểm tra lịch hẹn trùng
  const formattedDateTime = apptTime.format('YYYY-MM-DD HH:mm:ss');
  const existingAppointment = await db.Appointment.findOne({
    where: {
      doctor_id,
      appointment_datetime: formattedDateTime,
      status: {
        [Op.notIn]: ['cancelled', 'completed']
      }
    }
  });

  if (existingAppointment) {
    throw new BadRequestError("Khung giờ đã có người đặt");
  }

  // 7. Kiểm tra thông tin bệnh nhân
  const patient = await db.Patient.findOne({ where: { user_id } });
  if (!patient) {
    throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
  }

  // 8. Tạo lịch hẹn mới
  const fees = doctor.specialization?.fees || 0;
  const newAppointment = await db.Appointment.create({
    patient_id: patient.patient_id,
    doctor_id,
    appointment_datetime: formattedDateTime,
    fees,
    status: "waiting_for_confirmation",
  });

  // Format lại thời gian cho response
  const responseData = {
    ...newAppointment.dataValues,
    appointment_datetime: appointment_datetime // Trả về đúng định dạng thời gian từ request
  };

  return {
    success: true,
    message: "Đặt lịch hẹn thành công",
    data: responseData
  };
};

/**
 * Áp dụng mã bồi thường cho lịch hẹn mới
 * @param {string} code - Mã bồi thường
 * @param {number} appointment_id - ID của lịch hẹn mới
 * @param {number} patient_id - ID của bệnh nhân
 * @returns {Promise<Object>} - Thông tin về mã bồi thường đã áp dụng
 */
export const applyCompensationCode = async (code, appointment_id, patient_id) => {
  // Bắt đầu transaction
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra mã bồi thường tồn tại
    const compensationCode = await CompensationCode.findOne({
      where: { 
        code,
        patient_id,
        is_used: false
      },
      transaction: t
    });

    if (!compensationCode) {
      throw new NotFoundError('Mã bồi thường không tồn tại hoặc đã được sử dụng');
    }

    // 2. Kiểm tra mã còn hiệu lực
    const now = dayjs();
    const expiryDate = dayjs(compensationCode.expiry_date);
    
    if (now.isAfter(expiryDate)) {
      throw new BadRequestError('Mã bồi thường đã hết hạn');
    }

    // 3. Kiểm tra lịch hẹn mới tồn tại và thuộc bệnh nhân này
    const appointment = await db.Appointment.findOne({
      where: { 
        appointment_id,
        patient_id,
        status: 'waiting_for_confirmation'
      },
      transaction: t
    });

    if (!appointment) {
      throw new NotFoundError('Lịch hẹn không tồn tại hoặc không thuộc quyền của bạn');
    }

    // 4. Cập nhật trạng thái mã bồi thường
    compensationCode.is_used = true;
    compensationCode.used_appointment_id = appointment_id;
    await compensationCode.save({ transaction: t });

    // 5. Cập nhật thông tin bồi thường cho lịch hẹn mới
    appointment.compensation_code_id = compensationCode.compensation_id;
    
    // Tính toán số tiền giảm giá dựa trên tỷ lệ phần trăm và giới hạn tối đa
    let discountAmount = appointment.fees * (compensationCode.discount_percentage / 100);
    
    // Áp dụng giới hạn tối đa dựa trên tỷ lệ giảm giá
    if (compensationCode.discount_percentage === 5) {
      // Giới hạn tối đa 100.000đ cho giảm giá 5%
      discountAmount = Math.min(discountAmount, 100000);
    } else if (compensationCode.discount_percentage === 20) {
      // Giới hạn tối đa 300.000đ cho giảm giá 20%
      discountAmount = Math.min(discountAmount, 300000);
    }
    
    appointment.compensation_amount = discountAmount;
    
    // Cập nhật phí khám sau khi áp dụng giảm giá
    appointment.fees = appointment.fees - discountAmount;
    
    await appointment.save({ transaction: t });

    // 6. Commit transaction
    await t.commit();

    return {
      success: true,
      message: 'Áp dụng mã bồi thường thành công',
      data: {
        appointment_id: appointment.appointment_id,
        original_fees: appointment.fees + discountAmount,
        discounted_fees: appointment.fees,
        discount_percentage: compensationCode.discount_percentage,
        discount_amount: discountAmount,
        max_discount_limit: compensationCode.discount_percentage === 5 ? 100000 : 300000,
        compensation_code: {
          code: compensationCode.code,
          expiry_date: dayjs(compensationCode.expiry_date).format('YYYY-MM-DD')
        }
      }
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Lấy danh sách mã bồi thường của bệnh nhân
 * @param {number} patient_id - ID của bệnh nhân
 * @returns {Promise<Object>} - Danh sách mã bồi thường
 */
export const getPatientCompensationCodes = async (patient_id) => {
  try {
    const compensationCodes = await CompensationCode.findAll({
      where: { patient_id },
      order: [['created_at', 'DESC']]
    });

    return {
      success: true,
      message: 'Lấy danh sách mã bồi thường thành công',
      data: compensationCodes.map(code => ({
        code: code.code,
        amount: code.amount,
        is_used: code.is_used,
        used_appointment_id: code.used_appointment_id,
        expiry_date: dayjs(code.expiry_date).format('YYYY-MM-DD'),
        created_at: dayjs(code.created_at).format('YYYY-MM-DDTHH:mm:ssZ')
      }))
    };
  } catch (error) {
    throw error;
  }
};
