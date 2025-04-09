import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
import ForbiddenError from "../errors/forbidden.js";
import { Op, Sequelize } from "sequelize";
const { User, Doctor, DoctorDayOff, Appointment, Patient, CompensationCode } = db;
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';  // Sử dụng phần mở rộng .js
import timezone from 'dayjs/plugin/timezone.js';  // Sử dụng phần mở rộng .js
import { v4 as uuidv4 } from 'uuid';

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
      include: [{
        model: db.Specialization,
        as: "Specialization",
        attributes: ["fees"]
      }]
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

export const updateDoctorProfile = async (user_id, data, authenticatedUser) => {
  if (
    authenticatedUser.user_id !== user_id &&
    authenticatedUser.role !== "admin"
  ) {
    throw new ForbiddenError(
      "Bạn không có quyền cập nhật thông tin bác sĩ này"
    );
  }

  const user = await User.findOne({
    where: { user_id, role: "doctor" },
    include: { 
      model: Doctor, 
      as: "doctor",
      include: [{
        model: db.Specialization,
        as: "Specialization",
        attributes: ["fees"]
      }]
    },
  });

  if (!user) {
    throw new NotFoundError("Bác sĩ không tồn tại");
  }

  // Cập nhật bảng User
  if (data.username) user.username = data.username;
  if (data.email) user.email = data.email;

  // Cập nhật bảng Doctor
  if (data.specialization_id)
    user.doctor.specialization_id = data.specialization_id;
  if (data.degree) user.doctor.degree = data.degree;
  if (data.experience_years)
    user.doctor.experience_years = data.experience_years;
  if (data.description) user.doctor.description = data.description;

  await user.save();
  await user.doctor.save();

  return {
    message: "Cập nhật thông tin bác sĩ thành công",
    doctor: {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      specialization_id: user.doctor.specialization_id,
      degree: user.doctor.degree,
      experience_years: user.doctor.experience_years,
      fees: user.doctor.Specialization?.fees || 0,
      description: user.doctor.description,
    },
  };
};

export const getDoctorAppointments = async ({ doctor_id, filter_date, status, start_date, end_date }) => {
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
    const filterDay = dayjs.tz(filter_date, 'Asia/Ho_Chi_Minh').startOf('day');
    whereClause.appointment_datetime = {
      [Op.between]: [
        filterDay.format('YYYY-MM-DD HH:mm:ss'),
        filterDay.endOf('day').format('YYYY-MM-DD HH:mm:ss')
      ]
    };
  } else if (start_date && end_date) {
    whereClause.appointment_datetime = {
      [Op.between]: [
        dayjs.tz(start_date, 'Asia/Ho_Chi_Minh').startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        dayjs.tz(end_date, 'Asia/Ho_Chi_Minh').endOf('day').format('YYYY-MM-DD HH:mm:ss')
      ]
    };
  }

  // Lấy danh sách lịch hẹn
  const appointments = await Appointment.findAll({
    where: whereClause,
    include: [
      {
        model: Patient,
        as: "Patient",
        include: {
          model: User,
          as: "user",
          attributes: ["user_id", "username", "email"],
        },
      },
    ],
    order: [["appointment_datetime", "ASC"]],
  });

  // Format dữ liệu trả về với múi giờ Việt Nam
  return {
    success: true,
    message: "Lấy danh sách lịch hẹn thành công",
    data: appointments.map(appointment => ({
      appointment_id: appointment.appointment_id,
      patient_name: appointment.Patient.user.username,
      patient_email: appointment.Patient.user.email,
      appointment_datetime: dayjs(appointment.appointment_datetime)
        .tz('Asia/Ho_Chi_Minh')
        .format('YYYY-MM-DDTHH:mm:ss'),
      status: appointment.status,
      fees: appointment.fees,
      doctor_id: appointment.doctor_id
    }))
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
}

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
      [Op.between]: [new Date(start), new Date(end)]
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
  const uniquePatients = new Set(appointments.map(a => a.patient.patient_id)).size;

  const statusMap = {};
  appointments.forEach(appointment => {
    statusMap[appointment.status] = (statusMap[appointment.status] || 0) + 1;
  });

  const appointmentsByStatus = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
  }));

  return {
    success: true,
    message: "Lấy thống kê lịch hẹn thành công",
    data: {
      totalAppointments,
      uniquePatients,
      appointmentsByStatus,
      appointments: appointments.map(apt => ({
        id: apt.appointment_id,
        datetime: apt.appointment_datetime,
        status: apt.status,
        patient: {
          id: apt.patient.patient_id,
          name: apt.patient.user.username,
          email: apt.patient.user.email
        }
      }))
    },
  };
}

export const getAppointmentDetails = async (appointment_id, doctor_id) => {
  const appointment = await db.Appointment.findOne({
    where: { appointment_id, doctor_id },
    include: [
      {
        model: db.Patient,
        as: "Patient",
        include: {
          model: db.User,
          as: "user",
          attributes: ["user_id", "username", "email"],
        }
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
            include: [
              {
                model: db.Medicine,
                as: "medicine",
                attributes: ["medicine_id", "name", "price"],
              }
            ]
          }
        ]
      },
      {
        model: db.Payment,
        as: "Payments",
        attributes: ["payment_id", "amount", "payment_method", "status", "createdAt"],
      },
      {
        model: db.Feedback,
        as: "Feedback",
        attributes: ["rating", "comment", "createdAt"],
      }
    ]
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
        updatedAt: appointment.updatedAt
      },
      patient: {
        id: appointment.Patient.patient_id,
        user_id: appointment.Patient.user.user_id,
        name: appointment.Patient.user.username,
        email: appointment.Patient.user.email
      },
      medical_record: appointment.MedicalRecord ? {
        id: appointment.MedicalRecord.record_id,
        diagnosis: appointment.MedicalRecord.diagnosis,
        treatment: appointment.MedicalRecord.treatment,
        notes: appointment.MedicalRecord.notes,
        createdAt: appointment.MedicalRecord.createdAt
      } : null,
      prescription: appointment.Prescription ? {
        id: appointment.Prescription.prescription_id,
        status: appointment.Prescription.dispensed ? "Đã phát thuốc" : "Chưa phát thuốc",
        medicine_details: appointment.Prescription.medicine_details,
        medicines: appointment.Prescription.prescriptionMedicines.map(pm => ({
          id: pm.medicine.medicine_id,
          name: pm.medicine.name,
          quantity: pm.quantity,
          price: pm.medicine.price,
          total: pm.quantity * pm.medicine.price,
          note: pm.note
        })),
        createdAt: appointment.Prescription.createdAt
      } : null,
      payment: appointment.Payments ? {
        id: appointment.Payments.payment_id,
        amount: appointment.Payments.amount,
        status: appointment.Payments.status,
        payment_method: appointment.Payments.payment_method,
        payment_date: appointment.Payments.createdAt
      } : null,
      feedback: appointment.Feedback ? {
        rating: appointment.Feedback.rating,
        comment: appointment.Feedback.comment,
        createdAt: appointment.Feedback.createdAt
      } : null
    }
  };
}

export const cancelAppointment = async (appointment_id, doctor_id, reason, cancelled_by = 'doctor') => {
  const t = await db.sequelize.transaction();

  try {
    const appointment = await db.Appointment.findOne({
      where: { appointment_id, doctor_id },
      include: [
        {
          model: db.Patient,
          as: 'Patient',
          include: [{
            model: db.User,
            as: 'user',
            attributes: ['email', 'username'],
          }],
        },
        {
          model: db.Doctor,
          as: 'Doctor',
          include: [{
            model: db.User,
            as: 'user',
            attributes: ['email', 'username'],
          }],
        },
      ],
      transaction: t,
    });

    if (!appointment) {
      throw new NotFoundError('Lịch hẹn không tồn tại');
    }

    const invalidStatuses = ['cancelled', 'completed', 'doctor_day_off', 'patient_not_coming'];
    if (invalidStatuses.includes(appointment.status)) {
      throw new BadRequestError(`Không thể hủy lịch hẹn đã ${
        appointment.status === 'cancelled' ? 'bị hủy' :
        appointment.status === 'completed' ? 'hoàn thành' : 
        appointment.status === 'doctor_day_off' ? 'bị nghỉ' : 'được đánh dấu bệnh nhân không đến'
      }`);
    }

    const appointmentTime = dayjs(appointment.appointment_datetime).tz('Asia/Ho_Chi_Minh');
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const hoursBeforeAppointment = appointmentTime.diff(now, 'hour');
    const daysBeforeAppointment = appointmentTime.diff(now, 'day');

    let compensation = 0;
    let discountPercentage = 0;
    let cancelMessage = '';
    let compensationCode = null;
    let is_emergency = false;

    // Kiểm tra thời gian hủy lịch
    if (hoursBeforeAppointment >= 24) {
      // Hủy trước 24 giờ - không cần đền bù nhưng vẫn tạo mã giảm giá
      compensation = 0;
      discountPercentage = 0;
      is_emergency = false;
      cancelMessage = 'Huỷ lịch hẹn thành công';
      
      const code = `COMP-${uuidv4().substring(0, 8).toUpperCase()}`;
      const expiryDate = dayjs().add(30, 'day').toDate();
      
      compensationCode = await db.CompensationCode.create({
        appointment_id: appointment.appointment_id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        code: code,
        amount: null,
        discount_percentage: discountPercentage,
        expiry_date: expiryDate,
        max_discount: 0 // Không giới hạn vì không có giảm giá
      }, { transaction: t });
      
    } else if (hoursBeforeAppointment >= 3 && hoursBeforeAppointment < 24) {
      // Hủy trong khoảng 3-24 giờ - tự động giảm giá 5%
        discountPercentage = 5;
      compensation = 0;
      is_emergency = false;
      cancelMessage = 'Huỷ lịch hẹn thành công. Bệnh nhân sẽ được giảm 5% phí khám cho lần khám tiếp theo.';
        
        const code = `COMP-${uuidv4().substring(0, 8).toUpperCase()}`;
      const expiryDate = dayjs().add(180, 'day').toDate();
        
        compensationCode = await db.CompensationCode.create({
          appointment_id: appointment.appointment_id,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          code: code,
        amount: null,
          discount_percentage: discountPercentage,
          expiry_date: expiryDate,
        max_discount: 100000 // Giới hạn tối đa 100.000đ cho giảm giá 5%
        }, { transaction: t });

    } else if (hoursBeforeAppointment < 3) {
      // Hủy trong vòng 3 giờ - tự động đánh dấu là khẩn cấp
      is_emergency = true;
      if (cancelled_by === 'doctor') {
        // Hủy cấp bách - giảm giá 20% cho lần khám tiếp theo
        discountPercentage = 20;
        compensation = 0;
        cancelMessage = 'Huỷ lịch hẹn cấp bách thành công. Bệnh nhân sẽ được giảm 20% phí khám cho lần khám tiếp theo.';
        
        const code = `COMP-${uuidv4().substring(0, 8).toUpperCase()}`;
        const expiryDate = dayjs().add(180, 'day').toDate();
        
        compensationCode = await db.CompensationCode.create({
          appointment_id: appointment.appointment_id,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          code: code,
          amount: null,
          discount_percentage: discountPercentage,
          expiry_date: expiryDate,
          max_discount: 300000 // Giới hạn tối đa 300.000đ cho giảm giá 20%
        }, { transaction: t });
      }
    }

    appointment.status = 'cancelled';
    appointment.cancelled_at = now.toDate();
    appointment.cancelled_by = cancelled_by;
    appointment.cancel_reason = reason;
    appointment.compensation_amount = compensation;
    appointment.is_emergency_cancel = is_emergency;
    await appointment.save({ transaction: t });

    await t.commit();

    const emailInfo = {
      to: cancelled_by === 'doctor' ? appointment.Patient.user.email : appointment.Doctor.user.email,
      appointmentDate: appointmentTime.format('DD/MM/YYYY HH:mm'),
      cancelledBy: cancelled_by === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân',
      reason: reason,
      compensation: compensation > 0 ? `Bạn sẽ được đền bù ${compensation.toLocaleString('vi-VN')} VND` : null,
      discountPercentage: discountPercentage > 0 ? `Bạn sẽ được giảm ${discountPercentage}% phí khám cho lần khám tiếp theo` : null,
      compensationCode: compensationCode ? `Mã giảm giá của bạn là: ${compensationCode.code}` : null,
      isEmergency: is_emergency,
    };

    // TODO: Implement email notification
    // await sendEmailNotification(emailInfo);

    return {
      success: true,
      message: cancelMessage,
      data: {
        appointment_id: appointment.appointment_id,
        status: appointment.status,
        patient: {
          name: appointment.Patient.user.username,
          email: appointment.Patient.user.email,
        },
        doctor: {
          name: appointment.Doctor.user.username,
          email: appointment.Doctor.user.email,
        },
        datetime: appointmentTime.format('YYYY-MM-DDTHH:mm:ssZ'),
        cancelled_at: dayjs(appointment.cancelled_at).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ssZ'),
        cancelled_by: cancelled_by === 'doctor' ? appointment.Doctor.user.username : appointment.Patient.user.username,
        cancel_reason: appointment.cancel_reason,
        is_emergency: is_emergency,
        compensation_amount: compensation,
        discount_percentage: discountPercentage,
        compensation_code: compensationCode ? {
          code: compensationCode.code,
          discount_percentage: compensationCode.discount_percentage,
          expiry_date: dayjs(compensationCode.expiry_date).format('YYYY-MM-DD'),
          max_discount: compensationCode.max_discount
        } : null,
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
  if(["completed", "cancelled", "patient_not_coming"].includes(appointment.status)){
    throw new BadRequestError("Không thể cập nhật trạng thái lịch hẹn này");
  }
  const now = dayjs();
  const appointmentTime = dayjs(appointment.appointment_datetime);
  if(appointmentTime.isBefore(now)){
    throw new BadRequestError("Không thể cập nhật trạng thái lịch hẹn đã diễn ra");
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

export const completeAppointment = async (appointment_id, doctor_id, medical_data = null) => {
  // Kiểm tra cuộc hẹn
  const appointment = await db.Appointment.findOne({
    where: { appointment_id, doctor_id },
    include: [{
      model: db.Doctor,
      as: "Doctor",
      include: [{
        model: db.Specialization,
        as: "Specialization",
        attributes: ["fees"]
      }]
    }]
  });

  if (!appointment) {
    throw new NotFoundError("Lịch hẹn không tồn tại");
  }

  if (appointment.status !== "accepted") {
    throw new BadRequestError("Chỉ được hoàn thành lịch hẹn đã được tiếp nhận");
  }

  // Kiểm tra và tạo hồ sơ bệnh án nếu chưa có
  let medicalRecord = await db.MedicalRecord.findOne({
    where: { appointment_id }
  });

  if (!medicalRecord && medical_data) {
    medicalRecord = await db.MedicalRecord.create({
      appointment_id,
      ...medical_data,
      created_by: doctor_id,
      completed_at: new Date(),
      completed_by: doctor_id
    });
  } else if (!medicalRecord) {
    throw new BadRequestError("Vui lòng cung cấp thông tin hồ sơ bệnh án");
  }

  // Kiểm tra đơn thuốc
  const prescription = await db.Prescription.findOne({
    where: { appointment_id }
  });

  if (!prescription) {
    throw new BadRequestError("Vui lòng tạo đơn thuốc trước khi hoàn thành cuộc hẹn");
  }

  // Tạo bản ghi thanh toán phí khám
  const payment = await db.Payment.create({
    appointment_id,
    amount: appointment.Doctor.Specialization.fees || 0,
    status: 'pending',
    payment_method: 'cash',
    created_by: doctor_id
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
        completed_at: medicalRecord.completed_at
      },
      prescription: {
        prescription_id: prescription.prescription_id
      },
      payment: {
        payment_id: payment.payment_id,
        amount: payment.amount,
        status: payment.status
      }
    },
  };
};

export const getDoctorDayOffs = async (doctor_id, start, end, status, date) => {
  try {
    let whereClause = {
      doctor_id
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
      const targetDate = dayjs.tz(date, 'Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
      whereClause.off_date = targetDate;
    } else if (start && end) {
      whereClause.off_date = {
        [Op.between]: [
          dayjs.tz(start, 'Asia/Ho_Chi_Minh').startOf('day').format('YYYY-MM-DD'),
          dayjs.tz(end, 'Asia/Ho_Chi_Minh').endOf('day').format('YYYY-MM-DD')
        ]
      };
    } else if (start) {
      // Nếu chỉ có ngày bắt đầu, lấy từ ngày đó đến hiện tại
      whereClause.off_date = {
        [Op.gte]: dayjs.tz(start, 'Asia/Ho_Chi_Minh').startOf('day').format('YYYY-MM-DD')
      };
    } else if (end) {
      // Nếu chỉ có ngày kết thúc, lấy từ quá khứ đến ngày đó
      whereClause.off_date = {
        [Op.lte]: dayjs.tz(end, 'Asia/Ho_Chi_Minh').endOf('day').format('YYYY-MM-DD')
      };
    }

    const dayOffs = await DoctorDayOff.findAll({
      where: whereClause,
      order: [['off_date', 'ASC']]
    });

    // Format response với múi giờ Việt Nam và lấy thông tin các cuộc hẹn bị ảnh hưởng
    const formattedDayOffs = await Promise.all(dayOffs.map(async dayOff => {
      // Tìm các cuộc hẹn bị ảnh hưởng
      const affectedAppointments = await Appointment.findAll({
        where: {
          doctor_id,
          status: "doctor_day_off",
          appointment_datetime: {
            [Op.between]: [
              dayjs.tz(dayOff.off_date, 'Asia/Ho_Chi_Minh').startOf('day').format('YYYY-MM-DD HH:mm:ss'),
              dayjs.tz(dayOff.off_date, 'Asia/Ho_Chi_Minh').endOf('day').format('YYYY-MM-DD HH:mm:ss')
            ]
          }
        },
        include: [{
          model: Patient,
          as: 'patient',
          include: [{
            model: User,
            as: 'user',
            attributes: ['email']
          }]
        }]
      });

      return {
        id: dayOff.day_off_id,
        date: dayjs(dayOff.off_date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD'),
        morning: dayOff.off_morning,
        afternoon: dayOff.off_afternoon,
        reason: dayOff.reason,
        status: dayOff.status,
        createdAt: dayjs(dayOff.createdAt).tz('Asia/Ho_Chi_Minh').format(),
        affected_appointments: affectedAppointments.map(apt => ({
          id: apt.appointment_id,
          datetime: dayjs(apt.appointment_datetime).tz('Asia/Ho_Chi_Minh').format(),
          patient: {
            email: apt.patient.user.email
          }
        }))
      };
    }));

    return {
      success: true,
      message: "Lấy danh sách ngày nghỉ thành công",
      data: formattedDayOffs
    };
  } catch (error) {
    console.error('Error in getDoctorDayOffs:', error);
    throw new InternalServerError("Có lỗi xảy ra khi lấy danh sách ngày nghỉ");
  }
};

export const createDoctorDayOff = async (doctor_id, off_date, time_off, reason) => {
  // Bắt đầu transaction
  const t = await db.sequelize.transaction();

  try {
    // 1. Validate thời gian nghỉ
    if (!off_date || !time_off) {
      throw new BadRequestError("Thiếu thông tin ngày nghỉ hoặc buổi nghỉ");
    }

    if (!['morning', 'afternoon', 'full'].includes(time_off)) {
      throw new BadRequestError("Buổi nghỉ không hợp lệ");
    }

    // Chuyển đổi ngày nghỉ sang múi giờ Việt Nam và lấy đầu ngày
    const dayOffDate = dayjs.tz(off_date, 'Asia/Ho_Chi_Minh').startOf('day');
    if (!dayOffDate.isValid()) {
      throw new BadRequestError("Ngày nghỉ không hợp lệ");
    }

    // So sánh với thời gian hiện tại ở múi giờ Việt Nam (đầu ngày)
    const today = dayjs().tz('Asia/Ho_Chi_Minh').startOf('day');
    if (dayOffDate.isBefore(today)) {
      throw new BadRequestError("Không thể đăng ký ngày nghỉ trong quá khứ");
    }

    // Hàm trợ giúp để lấy điều kiện thời gian dựa trên time_off
    const getTimeCondition = (timeOffType) => {
      if (timeOffType === 'morning') {
        return Sequelize.where(
          Sequelize.fn('TIME', Sequelize.fn('CONVERT_TZ', Sequelize.col('appointment_datetime'), '+00:00', '+07:00')),
          {
            [Op.between]: ['08:00:00', '11:30:00']
          }
        );
      } else if (timeOffType === 'afternoon') {
        return Sequelize.where(
          Sequelize.fn('TIME', Sequelize.fn('CONVERT_TZ', Sequelize.col('appointment_datetime'), '+00:00', '+07:00')),
          {
            [Op.between]: ['13:30:00', '17:00:00']
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
        off_date: dayOffDate.format('YYYY-MM-DD'),
        status: "active"
      },
      transaction: t
    });

    let affectedAppointments = [];
    let message = "Đăng ký ngày nghỉ thành công";
    let updatedDayOff;

    // Nếu đã có ngày nghỉ, kiểm tra xem có thể đăng ký thêm không
    if (existingDayOff) {
      if (time_off === 'full') {
        // Nếu đã đăng ký cả hai buổi, báo lỗi
        if (existingDayOff.off_morning && existingDayOff.off_afternoon) {
          throw new BadRequestError("Bạn đã đăng ký nghỉ cả ngày này");
        }
        // Nếu đã đăng ký một buổi, cho phép đăng ký thêm buổi còn lại
        message = "Cập nhật ngày nghỉ thành công";
      } else if (time_off === 'morning' && existingDayOff.off_morning) {
        throw new BadRequestError("Bạn đã đăng ký nghỉ buổi sáng của ngày này");
      } else if (time_off === 'afternoon' && existingDayOff.off_afternoon) {
        throw new BadRequestError("Bạn đã đăng ký nghỉ buổi chiều của ngày này");
      }

      const updateData = {};
      let reasonUpdate = existingDayOff.reason || "";

      if (time_off === 'morning' && !existingDayOff.off_morning) {
        updateData.off_morning = true;
        reasonUpdate = reasonUpdate ? `${reasonUpdate}; ${reason}` : reason;
      } else if (time_off === 'afternoon' && !existingDayOff.off_afternoon) {
        updateData.off_afternoon = true;
        reasonUpdate = reasonUpdate ? `${reasonUpdate}; ${reason}` : reason;
      } else if (time_off === 'full') {
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
        updatedDayOff = await db.DoctorDayOff.findByPk(existingDayOff.day_off_id, { transaction: t });
        message = "Cập nhật ngày nghỉ thành công";

        // Tìm và cập nhật các lịch hẹn bị ảnh hưởng
        const timeCondition = getTimeCondition(time_off);

        const foundAppointments = await db.Appointment.findAll({
          where: {
            doctor_id,
            status: {
              [Op.in]: ["accepted", "waiting_for_confirmation"]
            },
            [Op.and]: [
              Sequelize.where(
                Sequelize.fn('DATE', Sequelize.col('appointment_datetime')),
                dayOffDate.format('YYYY-MM-DD')
              ),
              timeCondition
            ]
          },
          include: [{
            model: db.Patient,
            as: 'patient',
            include: [{
              model: db.User,
              as: 'user',
              attributes: ['email']
            }]
          }],
          transaction: t
        });

        // Cập nhật trạng thái các lịch hẹn bị ảnh hưởng
        if (foundAppointments.length > 0) {
          await db.Appointment.update(
            { status: "doctor_day_off" },
            {
              where: {
                appointment_id: foundAppointments.map(apt => apt.appointment_id)
              },
              transaction: t
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
            date: dayjs(existingDayOff.off_date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD'),
            morning: existingDayOff.off_morning,
            afternoon: existingDayOff.off_afternoon,
            reason: existingDayOff.reason,
            createdAt: dayjs(existingDayOff.createdAt).tz('Asia/Ho_Chi_Minh').format(),
            affected_appointments: []
          }
        };
      }
    } else {
      // 3. Tạo ngày nghỉ mới
      const newDayOff = await db.DoctorDayOff.create({
        doctor_id,
        off_date: dayOffDate.format('YYYY-MM-DD'),
        off_morning: time_off === 'morning' || time_off === 'full',
        off_afternoon: time_off === 'afternoon' || time_off === 'full',
        reason,
        status: "active"
      }, { transaction: t });
      updatedDayOff = newDayOff;

      // 4. Tìm các lịch hẹn bị ảnh hưởng
      const timeCondition = getTimeCondition(time_off);

      const foundAppointments = await db.Appointment.findAll({
        where: {
          doctor_id,
          status: {
            [Op.in]: ["accepted", "waiting_for_confirmation"]
          },
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('DATE', Sequelize.col('appointment_datetime')),
              dayOffDate.format('YYYY-MM-DD')
            ),
            timeCondition
          ]
        },
        include: [{
          model: db.Patient,
          as: 'patient',
          include: [{
            model: db.User,
            as: 'user',
            attributes: ['email']
          }]
        }],
        transaction: t
      });

      // Cập nhật trạng thái của các lịch hẹn bị ảnh hưởng
      if (foundAppointments.length > 0) {
        await db.Appointment.update(
          { status: "doctor_day_off" },
          {
            where: {
              appointment_id: foundAppointments.map(apt => apt.appointment_id)
            },
            transaction: t
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
        date: dayjs(updatedDayOff.off_date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD'),
        morning: updatedDayOff.off_morning,
        afternoon: updatedDayOff.off_afternoon,
        reason: updatedDayOff.reason,
        createdAt: dayjs(updatedDayOff.createdAt).tz('Asia/Ho_Chi_Minh').format(),
        affected_appointments: affectedAppointments.map(apt => ({
          id: apt.appointment_id,
          datetime: dayjs(apt.appointment_datetime).tz('Asia/Ho_Chi_Minh').format(),
          patient: {
            email: apt.patient.user.email
          }
        }))
      }
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
    const today = dayjs().tz('Asia/Ho_Chi_Minh').startOf('day');
    const offDate = dayjs(dayOff.off_date).tz('Asia/Ho_Chi_Minh').startOf('day');
    if (offDate.isBefore(today) || offDate.isSame(today, 'day')) {
      throw new BadRequestError("Không thể hủy ngày nghỉ trong quá khứ hoặc hôm nay");
    }

    // 3. Kiểm tra time_off hợp lệ
    if (!['morning', 'afternoon', 'full'].includes(time_off)) {
      throw new BadRequestError("Buổi nghỉ không hợp lệ");
    }

    // 4. Kiểm tra xem có đăng ký nghỉ buổi đó không
    if (time_off === 'morning' && !dayOff.off_morning) {
      throw new BadRequestError("Bạn chưa đăng ký nghỉ buổi sáng");
    }
    if (time_off === 'afternoon' && !dayOff.off_afternoon) {
      throw new BadRequestError("Bạn chưa đăng ký nghỉ buổi chiều");
    }

    // 5. Tìm các lịch hẹn bị ảnh hưởng dựa trên buổi được chọn
    const whereClause = {
      doctor_id,
      status: "doctor_day_off",
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn('DATE', Sequelize.col('appointment_datetime')),
          dayOff.off_date
        )
      ]
    };

    // Thêm điều kiện lọc theo thời gian
    if (time_off === 'morning') {
      whereClause[Op.and].push(
        Sequelize.where(
          Sequelize.fn('TIME', Sequelize.fn('CONVERT_TZ', Sequelize.col('appointment_datetime'), '+00:00', '+07:00')),
          {
            [Op.between]: ['08:00:00', '11:30:00']
          }
        )
      );
    } else if (time_off === 'afternoon') {
      whereClause[Op.and].push(
        Sequelize.where(
          Sequelize.fn('TIME', Sequelize.fn('CONVERT_TZ', Sequelize.col('appointment_datetime'), '+00:00', '+07:00')),
          {
            [Op.between]: ['13:30:00', '17:00:00']
          }
        )
      );
    }

    const affectedAppointments = await db.Appointment.findAll({
      where: whereClause,
      include: [{
        model: db.Patient,
        as: 'patient',
        include: [{
          model: db.User,
          as: 'user',
          attributes: ['email']
        }]
      }],
      transaction: t,
    });

    // 6. Cập nhật trạng thái ngày nghỉ
    const updateData = {};
    if (time_off === 'morning') {
      updateData.off_morning = false;
    } else if (time_off === 'afternoon') {
      updateData.off_afternoon = false;
    } else {
      updateData.status = "cancelled";
    }

    // Nếu cả hai buổi đều false thì đánh dấu là đã hủy
    if (time_off !== 'full' && 
        ((time_off === 'morning' && !dayOff.off_afternoon) || 
         (time_off === 'afternoon' && !dayOff.off_morning))) {
      updateData.status = "cancelled";
    }

    await dayOff.update(updateData, { transaction: t });

    // 7. Khôi phục trạng thái lịch hẹn
    if (affectedAppointments.length > 0) {
      await db.Appointment.update(
        { status: "waiting_for_confirmation" },
        {
          where: {
            appointment_id: affectedAppointments.map(apt => apt.appointment_id),
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
        affected_appointments: affectedAppointments.length > 0
          ? affectedAppointments.map(apt => ({
              id: apt.appointment_id,
              datetime: dayjs(apt.appointment_datetime)
                .tz('Asia/Ho_Chi_Minh')
                .format('YYYY-MM-DDTHH:mm:ssZ'),
              patient_email: apt.patient.user.email,
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
      doctor_id
    },
    include: [{
      model: db.Patient,
      as: 'Patient',
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['email', 'username']
      }]
    }]
  });

  if (!appointment) {
    throw new NotFoundError('Không tìm thấy lịch hẹn hoặc lịch hẹn không thuộc về bác sĩ này');
  }

  // Kiểm tra trạng thái lịch hẹn
  const invalidStatuses = ['accepted', 'completed', 'cancelled', 'doctor_day_off', 'patient_not_coming'];
  if (invalidStatuses.includes(appointment.status)) {
    throw new BadRequestError(`Không thể chấp nhận lịch hẹn đã ${
      appointment.status === 'accepted' ? 'được chấp nhận' :
      appointment.status === 'completed' ? 'hoàn thành' :
      appointment.status === 'cancelled' ? 'bị hủy' :
      appointment.status === 'doctor_day_off' ? 'bị nghỉ' : 'được đánh dấu bệnh nhân không đến'
    }`);
  }

  // Chuyển đổi thời gian về múi giờ Việt Nam
  const appointmentTime = dayjs(appointment.appointment_datetime).tz('Asia/Ho_Chi_Minh');
  const now = dayjs().tz('Asia/Ho_Chi_Minh');

  // Kiểm tra xem thời gian hẹn đã qua chưa
  if (appointmentTime.isBefore(now)) {
    throw new BadRequestError('Không thể chấp nhận lịch hẹn đã qua');
  }

  // Kiểm tra xem đã có lịch hẹn nào được chấp nhận trong cùng khung giờ chưa
  const existingAcceptedAppointment = await db.Appointment.findOne({
    where: {
      doctor_id,
      appointment_datetime: appointment.appointment_datetime,
      status: 'accepted',
      appointment_id: {
        [Op.ne]: appointment_id
      }
    }
  });

  if (existingAcceptedAppointment) {
    throw new BadRequestError('Đã có lịch hẹn khác được chấp nhận trong khung giờ này');
  }

  // Tìm tất cả các lịch hẹn khác trong cùng khung giờ đang ở trạng thái waiting_for_confirmation
  const conflictingAppointments = await db.Appointment.findAll({
    where: {
      doctor_id,
      appointment_datetime: appointment.appointment_datetime,
      status: 'waiting_for_confirmation',
      appointment_id: {
        [Op.ne]: appointment_id
      }
    },
    include: [{
      model: db.Patient,
      as: 'Patient',
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['email', 'username']
      }]
    }]
  });

  // Hủy tất cả các lịch hẹn trùng giờ
  if (conflictingAppointments.length > 0) {
    await Promise.all(conflictingAppointments.map(async (conflictAppointment) => {
      await conflictAppointment.update({
        status: 'cancelled',
        cancelled_at: now.toDate(),
        cancelled_by: 'system',
        cancel_reason: 'Bác sĩ đã chấp nhận một lịch hẹn khác trong cùng khung giờ'
      });

      // TODO: Gửi email thông báo cho bệnh nhân bị hủy lịch
      const emailInfo = {
        to: conflictAppointment.Patient.user.email,
        subject: 'Thông báo hủy lịch hẹn',
        patientName: conflictAppointment.Patient.user.username,
        appointmentDate: appointmentTime.format('DD/MM/YYYY HH:mm'),
        reason: 'Bác sĩ đã chấp nhận một lịch hẹn khác trong cùng khung giờ'
      };
      // await sendEmailNotification(emailInfo);
    }));
  }

  // Chấp nhận lịch hẹn được chọn
  await appointment.update({
    status: 'accepted'
  });

  // Gửi email thông báo cho bệnh nhân được chấp nhận
  const emailInfo = {
    to: appointment.Patient.user.email,
    subject: 'Thông báo chấp nhận lịch hẹn',
    patientName: appointment.Patient.user.username,
    appointmentDate: appointmentTime.format('DD/MM/YYYY HH:mm')
  };
  // await sendEmailNotification(emailInfo);

  return {
    success: true,
    message: 'Đã chấp nhận lịch hẹn thành công',
    data: {
      appointment_id: appointment.appointment_id,
      patient_name: appointment.Patient.user.username,
      patient_email: appointment.Patient.user.email,
      appointment_datetime: appointmentTime.format('YYYY-MM-DDTHH:mm:ssZ'),
      status: 'accepted',
      cancelled_appointments: conflictingAppointments.map(app => ({
        appointment_id: app.appointment_id,
        patient_name: app.Patient.user.username,
        patient_email: app.Patient.user.email,
        status: 'cancelled'
      }))
    }
  };
};

export const createMedicalRecord = async (doctor_id, appointment_id, data) => {
  // Lấy thông tin lịch hẹn
  const appointment = await db.Appointment.findOne({
    where: { appointment_id },
    include: {
      model: db.Patient,
      as: "Patient",
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
    throw new BadRequestError("Chỉ có thể tạo hồ sơ bệnh án sau khi lịch hẹn đã được chấp nhận");
  }

  // Kiểm tra thời gian tạo hồ sơ phải sau thời gian lịch hẹn
  // if (new Date() < new Date(appointment.appointment_datetime)) {
  //   throw new BadRequestError("Không thể tạo hồ sơ trước thời gian khám");
  // }

  // Kiểm tra xem đã có hồ sơ bệnh án cho lịch hẹn này chưa
  const existingRecord = await db.MedicalRecord.findOne({
    where: { appointment_id },
  });

  if (existingRecord) {
    throw new BadRequestError("Đã có hồ sơ bệnh án cho lịch hẹn này");
  }

  // Thiếu validate dữ liệu đầu vào
  if (!data.diagnosis || !data.treatment) {
    throw new BadRequestError("Thiếu thông tin chẩn đoán hoặc phương pháp điều trị");
  }

  // Tạo hồ sơ bệnh án
  const medicalRecord = await db.MedicalRecord.create({
    appointment_id,
    patient_id: appointment.patient_id,
    doctor_id,
    diagnosis: data.diagnosis,
    treatment: data.treatment,
    notes: data.notes,
    is_visible_to_patient: false,
    completed_at: new Date(),
    completed_by: doctor_id
  });

  return {
    success: true,
    message: "Tạo hồ sơ bệnh án thành công. Bệnh nhân cần thanh toán để xem kết quả.",
    data: {
      record_id: medicalRecord.record_id
    }
  };
};

/**
 * Tạo file PDF cho đơn thuốc
 * @param {number} prescription_id - ID của đơn thuốc
 * @returns {Promise<string>} - URL của file PDF
 */
const generatePrescriptionPDF = async (prescription_id) => {
  // Lấy thông tin đơn thuốc
  const prescription = await db.Prescription.findOne({
    where: { prescription_id },
    include: [
      {
        model: db.Appointment,
        as: "Appointment",
        include: [
          {
            model: db.Patient,
            as: "Patient",
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["username", "email"]
              }
            ]
          },
          {
            model: db.Doctor,
            as: "Doctor",
            include: [
              {
                model: db.Specialization,
                as: "Specialization",
                attributes: ["name"]
              },
              {
                model: db.User,
                as: "user",
                attributes: ["username"]
              }
            ]
          }
        ]
      },
      {
        model: db.PrescriptionMedicine,
        as: "PrescriptionMedicines",
        include: [
          {
            model: db.Medicine,
            as: "Medicine",
            attributes: ["name", "unit"]
          }
        ]
      }
    ]
  });

  if (!prescription) {
    throw new NotFoundError("Không tìm thấy đơn thuốc");
  }

  // Tạo tên file PDF
  const fileName = `prescription_${prescription_id}_${Date.now()}.pdf`;
  const filePath = `uploads/prescriptions/${fileName}`;

  // TODO: Implement PDF generation logic here
  // For now, return a dummy URL
  return `/prescriptions/${fileName}`;
};

export const createPrescriptions = async (
  appointment_id,
  doctor_id,
  note,
  medicines,
  use_hospital_pharmacy
) => {
  // Kiểm tra cuộc hẹn
  const appointment = await db.Appointment.findOne({
    where: { 
      appointment_id,
      doctor_id
    },
    include: [
      {
        model: db.Doctor,
        as: "Doctor",
        include: {
          model: db.Specialization,
          as: "Specialization"
        }
      }
    ]
  });

  if (!appointment) {
    throw new NotFoundError("Cuộc hẹn không tồn tại hoặc không thuộc về bác sĩ này");
  }

  if (appointment.status !== "accepted") {
    throw new BadRequestError("Chỉ được tạo đơn thuốc cho cuộc hẹn đã được tiếp nhận");
  }

  // Kiểm tra xem đã có đơn thuốc chưa
  const existingPrescription = await db.Prescription.findOne({
    where: { appointment_id }
  });

  if (existingPrescription) {
    throw new BadRequestError("Cuộc hẹn này đã có đơn thuốc");
  }

  // Lấy thông tin các thuốc
  const medicineIds = medicines.map(m => m.medicine_id);
  const medicineList = await db.Medicine.findAll({
    where: {
      medicine_id: {
        [Op.in]: medicineIds
      }
    }
  });

  if (medicineList.length !== medicineIds.length) {
    throw new BadRequestError("Một số thuốc không tồn tại trong hệ thống");
  }

  // Tạo đơn thuốc
  const prescription = await db.Prescription.create({
    appointment_id,
    note: note || null,
    created_by: doctor_id,
    status: "pending_prepare",
    use_hospital_pharmacy,
    createdAt: new Date()
  });

  // Tạo chi tiết đơn thuốc
  const prescriptionMedicines = [];

  for (const medicine of medicines) {
    const medicineInfo = medicineList.find(m => m.medicine_id === medicine.medicine_id);
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
      createdAt: new Date()
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
      instructions: medicine.instructions
    });
  }

  // Nếu không sử dụng nhà thuốc bệnh viện, tạo PDF ngay
  if (!use_hospital_pharmacy) {
    const pdfUrl = await generatePrescriptionPDF(prescription.prescription_id);
    await prescription.update({ pdf_url: pdfUrl });
  }

  // Trả về kết quả
  return {
    success: true,
    message: "Tạo đơn thuốc thành công",
    data: {
      prescription_id: prescription.prescription_id,
      appointment_id,
      status: prescription.status,
      note: prescription.note,
      medicines: prescriptionMedicines
    }
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
export const getAppointmentPayments = async (doctor_id, filters = {}, page = 1, limit = 10) => {
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
    const targetDate = dayjs.tz(filters.date, 'Asia/Ho_Chi_Minh');
    whereClause.appointment_datetime = {
      [Op.between]: [
        targetDate.startOf('day').toDate(),
        targetDate.endOf('day').toDate()
      ]
    };
  } else if (filters.start_date || filters.end_date) {
    // Nếu không có date nhưng có start_date hoặc end_date, lọc theo khoảng thời gian
    whereClause.appointment_datetime = {};
    if (filters.start_date) {
      whereClause.appointment_datetime[Op.gte] = dayjs.tz(filters.start_date, 'Asia/Ho_Chi_Minh').startOf('day').toDate();
    }
    if (filters.end_date) {
      whereClause.appointment_datetime[Op.lte] = dayjs.tz(filters.end_date, 'Asia/Ho_Chi_Minh').endOf('day').toDate();
    }
  }

  // Lấy danh sách cuộc hẹn có thanh toán
  const { count, rows } = await db.Appointment.findAndCountAll({
    where: {
      ...whereClause,
      doctor_id
    },
    include: [
      {
        model: db.Patient,
        as: "Patient",
        include: {
          model: db.User,
          as: "user",
          attributes: ["username", "email"],
        },
      },
      {
        model: db.Payment,
        as: "Payments",
        where: paymentWhereClause,
        required: true, // Luôn yêu cầu có thanh toán
        attributes: ["payment_id", "amount", "payment_method", "status", "createdAt"],
      }
    ],
    order: [['appointment_datetime', 'DESC']],
    limit,
    offset,
    distinct: true
  });

  // Format dữ liệu trả về
  const payments = rows.map(appointment => ({
    appointment_id: appointment.appointment_id,
    appointment_datetime: dayjs(appointment.appointment_datetime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
    patient: {
      name: appointment.Patient?.user?.username || '',
      email: appointment.Patient?.user?.email || ''
    },
    payment: appointment.Payments ? {
      id: appointment.Payments.payment_id,
      amount: appointment.Payments.amount ? 
        `${appointment.Payments.amount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ',
      status: appointment.Payments.status,
      payment_method: appointment.Payments.payment_method,
      payment_date: dayjs(appointment.Payments.createdAt).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
    } : null
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
        per_page: limit
      }
    }
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
export const updatePaymentStatus = async (doctor_id, payment_id, status, note = '') => {
  const t = await db.sequelize.transaction();

  try {
    // Kiểm tra thanh toán tồn tại và thuộc về bác sĩ
    const payment = await db.Payment.findOne({
      where: { payment_id },
      include: [{
        model: db.Appointment,
        as: "Appointment",
        where: { doctor_id },
        required: true
      }],
      transaction: t
    });

    if (!payment) {
      throw new NotFoundError("Không tìm thấy thanh toán hoặc thanh toán không thuộc về bác sĩ này");
    }

    // Kiểm tra trạng thái hợp lệ
    const validStatuses = ['paid', 'pending', 'cancel'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError("Trạng thái thanh toán không hợp lệ");
    }

    // Cập nhật trạng thái thanh toán
    await payment.update({
      status,
      note: note || payment.note
    }, { transaction: t });

    await t.commit();

    return {
      success: true,
      message: "Cập nhật trạng thái thanh toán thành công",
      data: {
        payment_id: payment.payment_id,
        appointment_id: payment.appointment_id,
        amount: `${payment.amount.toLocaleString('vi-VN')} VNĐ`,
        status: payment.status,
        payment_method: payment.payment_method,
        payment_date: dayjs(payment.createdAt).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
        note: payment.note
      }
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};