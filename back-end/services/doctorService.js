import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
import ForbiddenError from "../errors/forbidden.js";
import { Op, Sequelize } from "sequelize";
const { User, Doctor, DoctorDayOff, Appointment, Patient } = db;
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';  // Sử dụng phần mở rộng .js
import timezone from 'dayjs/plugin/timezone.js';  // Sử dụng phần mở rộng .js


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
  fees,
}) => {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) throw new BadRequestError("Email đã được đăng ký");

  //const hashedPassword = await bcrypt.hash(password, 10);
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
    fees,
  });

  return { message: "Đăng ký account Bác sĩ thành công", doctor: newDoctor };
};

export const loginDoctor = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email, role: "doctor" },
    include: { model: Doctor, as: "doctor" },
  });
  if (!user) {
    throw new NotFoundError("Không tìm thấy tài khoản Bác sĩ");
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new UnauthorizedError("Mật khẩu không chính xác");
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
      fees: user.doctor.fees,
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
    include: { model: Doctor, as: "doctor" },
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
  if (data.fees) user.doctor.fees = data.fees;
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
      fees: user.doctor.fees,
      description: user.doctor.description,
    },
  };
};

export const createDoctorDayOff = async (doctor_id, off_date, time_off, reason) => {
  // Bắt đầu transaction
  const t = await db.sequelize.transaction();

  try {
    console.log('createDoctorDayOff parameters:', {
      doctor_id,
      off_date,
      time_off,
      reason
    });

    // 1. Validate thời gian nghỉ
    if (!off_date || !time_off) {
      console.log('Validation failed in service - missing required fields');
      throw new BadRequestError("Thiếu thông tin ngày nghỉ hoặc buổi nghỉ");
    }

    if (!['morning', 'afternoon', 'all'].includes(time_off)) {
      console.log('Invalid time_off value:', time_off);
      throw new BadRequestError("Buổi nghỉ không hợp lệ");
    }

    const dayOffDate = dayjs(off_date);
    console.log('Parsed date:', {
      input: off_date,
      parsed: dayOffDate.format('YYYY-MM-DD'),
      isValid: dayOffDate.isValid()
    });

    if (!dayOffDate.isValid()) {
      throw new BadRequestError("Ngày nghỉ không hợp lệ");
    }

    const today = dayjs().startOf('day');
    if (dayOffDate.isBefore(today)) {
      throw new BadRequestError("Không thể đăng ký ngày nghỉ trong quá khứ");
    }

    // 2. Kiểm tra xem đã đăng ký nghỉ chưa
    const existingDayOff = await db.DoctorDayOff.findOne({
      where: {
        doctor_id,
        off_date: dayOffDate.format('YYYY-MM-DD'),
        status: "active"
      },
      transaction: t
    });

    // Nếu đã có ngày nghỉ, kiểm tra xem có thể đăng ký thêm không
    if (existingDayOff) {
      if (time_off === 'all') {
        throw new BadRequestError("Bạn đã đăng ký nghỉ vào ngày này");
      }
      if (time_off === 'morning' && existingDayOff.off_morning) {
        throw new BadRequestError("Bạn đã đăng ký nghỉ buổi sáng của ngày này");
      }
      if (time_off === 'afternoon' && existingDayOff.off_afternoon) {
        throw new BadRequestError("Bạn đã đăng ký nghỉ buổi chiều của ngày này");
      }

      // Cập nhật thêm buổi nghỉ mới
      if (time_off === 'morning') {
        await existingDayOff.update({
          off_morning: true,
          reason: existingDayOff.reason + "; " + reason
        }, { transaction: t });
      } else if (time_off === 'afternoon') {
        await existingDayOff.update({
          off_afternoon: true,
          reason: existingDayOff.reason + "; " + reason
        }, { transaction: t });
      }

      // Tìm và cập nhật các lịch hẹn bị ảnh hưởng
      const affectedAppointments = await db.Appointment.findAll({
        where: {
          doctor_id,
          status: "accepted",
          [Op.and]: [
            Sequelize.where(Sequelize.fn('DATE', Sequelize.col('appointment_datetime')), dayOffDate.format('YYYY-MM-DD')),
            time_off === 'morning' 
              ? Sequelize.where(Sequelize.fn('HOUR', Sequelize.col('appointment_datetime')), '<', 12)
              : Sequelize.where(Sequelize.fn('HOUR', Sequelize.col('appointment_datetime')), '>=', 12)
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
      if (affectedAppointments.length > 0) {
        await db.Appointment.update(
          { status: "doctor_day_off" },
          {
            where: {
              appointment_id: affectedAppointments.map(apt => apt.appointment_id)
            },
            transaction: t
          }
        );
      }

      await t.commit();

      return {
        success: true,
        message: "Cập nhật ngày nghỉ thành công",
        data: {
          id: existingDayOff.day_off_id,
          date: existingDayOff.off_date,
          morning: existingDayOff.off_morning,
          afternoon: existingDayOff.off_afternoon,
          reason: existingDayOff.reason,
          created_at: existingDayOff.createdAt,
          affected_appointments: affectedAppointments.map(apt => ({
            id: apt.appointment_id,
            datetime: apt.appointment_datetime,
            patient: {
              email: apt.patient.user.email
            }
          }))
        }
      };
    }

    // 3. Tạo ngày nghỉ mới
    const newDayOff = await db.DoctorDayOff.create({
      doctor_id,
      off_date: dayOffDate.format('YYYY-MM-DD'),
      off_morning: time_off === 'morning' || time_off === 'all',
      off_afternoon: time_off === 'afternoon' || time_off === 'all',
      reason,
      status: "active"
    }, { transaction: t });

    // 4. Tìm các lịch hẹn bị ảnh hưởng
    const affectedAppointments = await db.Appointment.findAll({
      where: {
        doctor_id,
        status: "accepted",
        [Op.and]: [
          Sequelize.where(Sequelize.fn('DATE', Sequelize.col('appointment_datetime')), dayOffDate.format('YYYY-MM-DD')),
          time_off === 'all'
            ? {}
            : time_off === 'morning'
              ? Sequelize.where(Sequelize.fn('HOUR', Sequelize.col('appointment_datetime')), '<', 12)
              : Sequelize.where(Sequelize.fn('HOUR', Sequelize.col('appointment_datetime')), '>=', 12)
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

    // 5. Cập nhật trạng thái các lịch hẹn bị ảnh hưởng
    if (affectedAppointments.length > 0) {
      await db.Appointment.update(
        { status: "doctor_day_off" },
        {
          where: {
            appointment_id: affectedAppointments.map(apt => apt.appointment_id)
          },
          transaction: t
        }
      );
    }

    await t.commit();

    return {
      success: true,
      message: "Đăng ký ngày nghỉ thành công",
      data: {
        id: newDayOff.day_off_id,
        date: newDayOff.off_date,
        morning: newDayOff.off_morning,
        afternoon: newDayOff.off_afternoon,
        reason: newDayOff.reason,
        created_at: newDayOff.createdAt,
        affected_appointments: affectedAppointments.map(apt => ({
          id: apt.appointment_id,
          datetime: apt.appointment_datetime,
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
  // Kiểm tra ngày nghỉ tồn tại
  const dayOff = await DoctorDayOff.findOne({
    where: {
      day_off_id,
      doctor_id,
      status: "active"
    }
  });

  if (!dayOff) {
    throw new NotFoundError("Không tìm thấy ngày nghỉ");
  }

  // Kiểm tra tham số time_off hợp lệ
  if (!['morning', 'afternoon', 'full'].includes(time_off)) {
    throw new BadRequestError("Buổi nghỉ không hợp lệ. Chỉ có thể hủy 'morning', 'afternoon', hoặc 'full'.");
  }

  // Kiểm tra thời gian hủy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offDate = new Date(dayOff.off_date);
  if (offDate <= today) {
    throw new BadRequestError("Không thể hủy ngày nghỉ trong quá khứ hoặc hôm nay");
  }

  // Kiểm tra xem có đăng ký nghỉ buổi đó không
  if (time_off === 'morning' && !dayOff.off_morning) {
    throw new BadRequestError("Bạn không có đăng ký nghỉ buổi sáng");
  }
  if (time_off === 'afternoon' && !dayOff.off_afternoon) {
    throw new BadRequestError("Bạn không có đăng ký nghỉ buổi chiều");
  }
  if (time_off === 'full' && (!dayOff.off_morning && !dayOff.off_afternoon)) {
    throw new BadRequestError("Bạn không có đăng ký nghỉ cả ngày");
  }

  // Xác định thực sự cần hủy buổi nào
  let cancelMorning = false;
  let cancelAfternoon = false;
  let message = '';

  if (time_off === 'full') {
    // Nếu yêu cầu hủy cả ngày nhưng chỉ đăng ký một buổi
    if (dayOff.off_morning && !dayOff.off_afternoon) {
      cancelMorning = true;
      message = "Chỉ có lịch nghỉ buổi sáng được hủy. Buổi chiều vẫn làm việc bình thường.";
    } else if (!dayOff.off_morning && dayOff.off_afternoon) {
      cancelAfternoon = true;
      message = "Chỉ có lịch nghỉ buổi chiều được hủy. Buổi sáng vẫn làm việc bình thường.";
    } else {
      cancelMorning = true;
      cancelAfternoon = true;
      message = "Đã hủy lịch nghỉ cả ngày thành công.";
    }
  } else if (time_off === 'morning') {
    cancelMorning = true;
    message = "Đã hủy lịch nghỉ buổi sáng thành công. Buổi chiều vẫn giữ nguyên trạng thái.";
  } else {
    cancelAfternoon = true;
    message = "Đã hủy lịch nghỉ buổi chiều thành công. Buổi sáng vẫn giữ nguyên trạng thái.";
  }

  // Tìm các lịch hẹn bị ảnh hưởng
  const affectedAppointments = await db.Appointment.findAll({
    where: {
      doctor_id,
      status: "doctor_day_off",
      [Op.and]: [
        Sequelize.where(Sequelize.fn('DATE', Sequelize.col('appointment_datetime')), dayOff.off_date),
        {
          [Op.or]: [
            cancelMorning ? Sequelize.where(Sequelize.fn('HOUR', Sequelize.col('appointment_datetime')), '<', 12) : null,
            cancelAfternoon ? Sequelize.where(Sequelize.fn('HOUR', Sequelize.col('appointment_datetime')), '>=', 12) : null
          ].filter(Boolean)
        }
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
    }]
  });

  // Cập nhật trạng thái ngày nghỉ
  if (cancelMorning && cancelAfternoon) {
    await dayOff.update({ status: "cancelled" });
  } else {
    await dayOff.update({
      off_morning: cancelMorning ? false : dayOff.off_morning,
      off_afternoon: cancelAfternoon ? false : dayOff.off_afternoon
    });
  }

  // Khôi phục trạng thái các lịch hẹn
  if (affectedAppointments.length > 0) {
    await db.Appointment.update(
      { status: "waiting_for_confirmation" },
      {
        where: {
          appointment_id: affectedAppointments.map(apt => apt.appointment_id)
        }
      }
    );
  }

  return {
    success: true,
    message: message,
    data: {
      day_off: {
        ...dayOff.dataValues,
        remaining_morning: !cancelMorning && dayOff.off_morning,
        remaining_afternoon: !cancelAfternoon && dayOff.off_afternoon
      },
      affected_appointments: affectedAppointments.map(apt => ({
        id: apt.appointment_id,
        datetime: apt.appointment_datetime,
        patient: {
          email: apt.patient.user.email
        }
      }))
    }
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

  // Xử lý điều kiện lọc theo ngày
  if (filter_date) {
    const filterDay = dayjs(filter_date).startOf('day');
    whereClause.appointment_datetime = {
      [Op.between]: [
        filterDay.format('YYYY-MM-DD HH:mm:ss'),
        filterDay.endOf('day').format('YYYY-MM-DD HH:mm:ss')
      ]
    };
  } else if (start_date && end_date) {
    whereClause.appointment_datetime = {
      [Op.between]: [
        dayjs(start_date).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        dayjs(end_date).endOf('day').format('YYYY-MM-DD HH:mm:ss')
      ]
    };
  }

  // Lấy danh sách lịch hẹn
  const appointments = await db.Appointment.findAll({
    where: whereClause,
    include: [
      {
        model: db.Patient,
        as: "patient",
        include: {
          model: db.User,
          as: "user",
          attributes: ["user_id", "username", "email"],
        },
      },
    ],
    order: [["appointment_datetime", "ASC"]],
  });

  // Format dữ liệu trả về
  return {
    success: true,
    message: "Lấy danh sách lịch hẹn thành công",
    data: appointments.map(appointment => ({
      appointment_id: appointment.appointment_id,
      patient_name: appointment.patient.user.username,
      patient_email: appointment.patient.user.email,
      appointment_datetime: dayjs(appointment.appointment_datetime)
        .format('YYYY-MM-DDTHH:mm:ss'), // Giữ nguyên giờ như trong DB
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
  const appointmentsByStatus = await db.Appointment.findAll({
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

  const appointments = await db.Appointment.findAll({
    where: whereClause,
    include: [
      {
        model: db.Patient,
        as: "patient",
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
        as: "patient",
        include: {
          model: db.User,
          as: "user",
          attributes: ["user_id", "username", "email"],
        }
      }, 
      {
        model: db.MedicalRecord,
        as: "medicalRecord",
      },
      {
        model: db.Prescription,
        as: "prescription",
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
        as: "payments",
        attributes: ["payment_id", "amount", "payment_method", "status", "createdAt"],
      },
      {
        model: db.Feedback,
        as: "feedback",
        attributes: ["rating", "comment", "createdAt"],
      }
    ]
  });

  if (!appointment) {
    throw new NotFoundError("Lịch hẹn không tồn tại");
  }

  // Tính tổng tiền thuốc nếu có đơn thuốc
  let totalMedicineCost = 0;
  if (appointment.prescription && appointment.prescription.prescriptionMedicines) {
    totalMedicineCost = appointment.prescription.prescriptionMedicines.reduce((total, pm) => {
      return total + (pm.medicine.price * pm.quantity || 0);
    }, 0);
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
        created_at: appointment.createdAt,
        updated_at: appointment.updatedAt
      },
      patient: {
        id: appointment.patient.patient_id,
        user_id: appointment.patient.user.user_id,
        name: appointment.patient.user.username,
        email: appointment.patient.user.email
      },
      medical_record: appointment.medicalRecord ? {
        id: appointment.medicalRecord.record_id,
        diagnosis: appointment.medicalRecord.diagnosis,
        treatment: appointment.medicalRecord.treatment,
        notes: appointment.medicalRecord.notes,
        created_at: appointment.medicalRecord.createdAt
      } : null,
      prescription: appointment.prescription ? {
        id: appointment.prescription.prescription_id,
        status: appointment.prescription.dispensed ? "Đã phát thuốc" : "Chưa phát thuốc",
        medicine_details: appointment.prescription.medicine_details,
        medicines: appointment.prescription.prescriptionMedicines.map(pm => ({
          id: pm.medicine.medicine_id,
          name: pm.medicine.name,
          quantity: pm.quantity,
          price: pm.medicine.price,
          total: pm.quantity * pm.medicine.price,
          note: pm.note
        })),
        total_cost: totalMedicineCost,
        created_at: appointment.prescription.createdAt
      } : null,
      payment: appointment.payments ? {
        id: appointment.payments.payment_id,
        amount: appointment.payments.amount,
        status: appointment.payments.status,
        payment_method: appointment.payments.payment_method,
        payment_date: appointment.payments.createdAt
      } : null,
      feedback: appointment.feedback ? {
        rating: appointment.feedback.rating,
        comment: appointment.feedback.comment,
        created_at: appointment.feedback.createdAt
      } : null
    }
  };
}
export const acceptAppointment = async (appointment_id, doctor_id) => {
  const appointment = await db.Appointment.findOne({
    where: { appointment_id, doctor_id },
  });
  if (!appointment) {
    throw new NotFoundError("Lịch hẹn không tồn tại");
  }
  if (appointment.status !== "waiting_for_confirmation") {
    throw new BadRequestError("Lịch hẹn này không thể xác nhận");
  }
  appointment.status = "accepted";
  await appointment.save();
  return {
    success: true,
    message: "Xác nhận lịch hẹn thành công",
    data: {
      id: appointment.appointment_id,
      status: appointment.status,
    }
  }
  
}
export const cancelAppointment = async (appointment_id, doctor_id) => {
  const appointment = await db.Appointment.findOne({
    where: { appointment_id, doctor_id },
  });
  if (!appointment) {
    throw new NotFoundError("Lịch hẹn không tồn tại");
  }
  if (appointment.status === "cancelled" || appointment.status === "completed") {
    throw new BadRequestError("Lịch hẹn đã bị huỷ hoặc hoàn tất, không thể huỷ lại");
  }
  const now = dayjs();
  const appointmentTime = dayjs(appointment.appointment_datetime);
  if (appointmentTime.diff(now, "hour") < 3) {
    throw new BadRequestError("Chỉ được huỷ lịch hẹn trước giờ khám ít nhất 3 tiếng");
  }
  appointment.status = "cancelled";
  await appointment.save();
  return {
    success: true,
    message: "Huỷ lịch hẹn thành công",
    data: {
      id: appointment.appointment_id,
      status: appointment.status,
    }
  }
}
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
export const completeAppointment = async (appointment_id, doctor_id) => {
  const appointment = await db.Appointment.findOne({
    where: { appointment_id, doctor_id },
  });

  if (!appointment) {
    throw new NotFoundError("Lịch hẹn không tồn tại");
  }

  if (appointment.status !== "accepted") {
    throw new BadRequestError("Chỉ được hoàn thành lịch hẹn đã được tiếp nhận");
  }

  const now = dayjs();
  const appointmentTime = dayjs(appointment.appointment_datetime);
  if (now.isBefore(appointmentTime)) {
    throw new BadRequestError("Chưa đến giờ hẹn, không thể hoàn thành");
  }

  appointment.status = "completed";
  await appointment.save();

  return {
    success: true,
    message: "Cập nhật lịch hẹn hoàn thành thành công",
    data: {
      appointment_id: appointment.appointment_id,
      status: appointment.status,
    },
  };
};

export const getDoctorDayOffs = async (doctor_id, start, end) => {
  let whereClause = {
    doctor_id,
    status: "active"
  };

  if (start && end) {
    whereClause.off_date = {
      [Op.between]: [start, end]
    };
  } else if (start) {
    whereClause.off_date = {
      [Op.gte]: start
    };
  } else if (end) {
    whereClause.off_date = {
      [Op.lte]: end
    };
  }

  const dayOffs = await DoctorDayOff.findAll({
    where: whereClause,
    order: [['off_date', 'ASC']]
  });

  // Format response
  const formattedDayOffs = dayOffs.map(dayOff => ({
    id: dayOff.day_off_id,
    date: dayOff.off_date,
    morning: dayOff.off_morning,
    afternoon: dayOff.off_afternoon,
    reason: dayOff.reason,
    created_at: dayOff.createdAt
  }));

  return {
    success: true,
    message: "Lấy danh sách ngày nghỉ thành công",
    data: formattedDayOffs
  };
};

export const createMedicalRecord = async (doctor_id, appointment_id, data) => {
  // Lấy thông tin lịch hẹn
  const appointment = await db.Appointment.findOne({
    where: { appointment_id },
    include: {
      model: db.Patient,
      as: "patient",
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
  if (new Date() < new Date(appointment.appointment_datetime)) {
    throw new BadRequestError("Không thể tạo hồ sơ trước thời gian khám");
  }

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
    diagnosis: data.diagnosis,
    treatment: data.treatment,
    notes: data.notes,
  });

  return {
    success: true,
    message: "Tạo hồ sơ bệnh án thành công",
    data: medicalRecord,
  };
};

export const createDayOff = async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    const doctor_id = req.user.user_id;
    
    // Destructure request body
    const { off_date, time_off, reason } = req.body;
    
    console.log('Doctor ID:', doctor_id);
    console.log('Off date:', off_date);
    console.log('Time off:', time_off);
    console.log('Reason:', reason);

    // Validate input
    if (!off_date || !time_off) {
      console.log('Validation failed - missing required fields');
      throw new BadRequestError("Thiếu thông tin ngày nghỉ hoặc buổi nghỉ");
    }

    // Gọi service với các tham số riêng lẻ
    const result = await createDoctorDayOff(
      doctor_id,
      off_date,  // Truyền trực tiếp giá trị off_date
      time_off,  // Truyền trực tiếp giá trị time_off
      reason || ''  // Truyền trực tiếp giá trị reason
    );
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in createDayOff:', error);
    next(error);
  }
};

export const cancelDayOff = async (req, res, next) => {
  try {
    const result = await cancelDoctorDayOff(req.user.user_id, req.params.day_off_id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
