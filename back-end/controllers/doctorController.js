import {
  registerDoctor,
  loginDoctor,
  updateDoctorProfile,
  createDoctorDayOff,
  cancelDoctorDayOff,
  getDoctorAppointments,
  getDoctorSummary,
  getDoctorAppointmentStats,
  getAppointmentDetails,
  acceptAppointment,
  cancelAppointment,
  markPatientNotComing,
  completeAppointment,
  getDoctorDayOffs,
  createMedicalRecord,
  createPrescriptions
} from "../services/doctorService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";
import asyncHandler from "express-async-handler";
import NotFoundError from "../errors/not_found.js";
import { Op } from "sequelize";

export const registerDoctorController = async (req, res, next) => {
  try {
    const doctor = await registerDoctor(req.body);
    res.status(201).json(doctor);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
export const loginDoctorController = async (req, res, next) => {
  try {
    const doctor = await loginDoctor(req.body);
    res.status(200).json(doctor);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};

export const getDoctorAppointmentsController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id;
  const { filter_date, status, start_date, end_date } = req.query;

  // Gọi service với các tham số đã được xử lý
  const result = await getDoctorAppointments({
    doctor_id,
    filter_date,
    status,
    start_date,
    end_date
  });

  res.status(200).json(result);
});
export const getDoctorSummaryController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id;
  const result = await getDoctorSummary(doctor_id);
  res.status(200).json(result);
});
export const getDoctorAppointmentStatsController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id;
  const { start, end } = req.query;

  const result = await getDoctorAppointmentStats(doctor_id, start, end);
  res.status(200).json(result);
});
export const getAppointmentDetailsController = async (req, res, next) => {
    try {
        const { appointment_id } = req.params;
        const doctor_id = req.user.user_id;
        
        console.log('Params:', { appointment_id, doctor_id });
        
        if (!appointment_id) {
            throw new BadRequestError("Thiếu mã cuộc hẹn");
        }

        const result = await getAppointmentDetails(appointment_id, doctor_id);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getAppointmentDetailsController:', error);
        if (error instanceof BadRequestError || error instanceof NotFoundError) {
            next(error);
        } else {
            next(new InternalServerError(error.message));
        }
    }
};
export const acceptAppointmentController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id;
  const { appointment_id } = req.params;

  if (!appointment_id) {
    throw new BadRequestError("Thiếu mã cuộc hẹn");
  }

  const result = await acceptAppointment(appointment_id, doctor_id);
  res.status(200).json(result);
});

export const markPatientNotComingController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id;
  const appointment_id = req.params.id;

  const result = await markPatientNotComing(appointment_id, doctor_id);
  res.status(200).json(result);
});
export const getDoctorDayOffsController = asyncHandler(async (req, res, next) => {
  try {
    const doctor_id = req.user.user_id;
    const { start, end, status, date } = req.query;

    const result = await getDoctorDayOffs(doctor_id, start, end, status, date);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
});
export const createDoctorDayOffController = async (req, res) => {
  try {
    const { off_date, off_morning, off_afternoon, reason, is_emergency } = req.body;
    const doctor_id = req.user.doctor.doctor_id;

    // Tạo ngày nghỉ
    const dayOff = await DoctorDayOff.create({
      doctor_id,
      off_date,
      off_morning,
      off_afternoon,
      reason,
      is_emergency,
      status: 'active'
    });

    // Tìm các lịch hẹn bị ảnh hưởng
    const affectedAppointments = await Appointment.findAll({
      where: {
        doctor_id,
        appointment_datetime: {
          [Op.between]: [
            new Date(off_date + ' 00:00:00'),
            new Date(off_date + ' 23:59:59')
          ]
        },
        status: {
          [Op.in]: ['waiting_for_confirmation', 'accepted']
        }
      }
    });

    // Lưu các lịch hẹn bị ảnh hưởng
    for (const appointment of affectedAppointments) {
      await DayOffAppointment.create({
        day_off_id: dayOff.day_off_id,
        appointment_id: appointment.appointment_id
      });

      // Nếu là nghỉ khẩn cấp (ít hơn 3 giờ trước lịch hẹn)
      if (is_emergency) {
        const appointmentTime = new Date(appointment.appointment_datetime);
        const now = new Date();
        const hoursDiff = (appointmentTime - now) / (1000 * 60 * 60);

        if (hoursDiff < 3) {
          // Tạo mã bồi thường
          const compensationCode = await CompensationCode.create({
            appointment_id: appointment.appointment_id,
            patient_id: appointment.patient_id,
            doctor_id,
            code: generateCompensationCode(), // Hàm tạo mã ngẫu nhiên
            amount: appointment.fees * 0.1, // 10% phí khám
            discount_percentage: 10,
            expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 tháng
          });

          // Cập nhật trạng thái lịch hẹn
          await appointment.update({
            status: 'doctor_day_off',
            cancelled_at: new Date(),
            cancelled_by: 'doctor',
            cancel_reason: reason
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Tạo ngày nghỉ thành công',
      data: {
        dayOff,
        affectedAppointments: affectedAppointments.length
      }
    });
  } catch (error) {
    console.error('Error creating doctor day off:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tạo ngày nghỉ',
      error: error.message
    });
  }
};
export const cancelDoctorDayOffController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id; // Lấy từ token
  const day_off_id = req.params.id;
  const { time_off } = req.body;

  if (!time_off) {
    throw new BadRequestError("Thiếu thông tin buổi nghỉ cần hủy");
  }

  // Gọi service cancelDoctorDayOff để xử lý
  const result = await cancelDoctorDayOff(doctor_id, day_off_id, time_off);

  // Trả về kết quả cho người dùng
  res.status(200).json(result);
});
export const cancelAppointmentController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id;
    const appointment_id = parseInt(req.params.id);
    const { reason, is_emergency = false } = req.body;

    // Kiểm tra appointment_id
    if (!appointment_id || isNaN(appointment_id)) {
      return res.status(400).json({
        success: false,
        error: "Mã cuộc hẹn không hợp lệ"
      });
    }

    // Kiểm tra reason
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng nhập lý do"
      });
    }

    // Kiểm tra độ dài reason
    if (reason.trim().length < 3 || reason.trim().length > 200) {
      return res.status(400).json({
        success: false,
        error: "Lý do phải từ 3 đến 200 ký tự"
      });
    }

    // Nếu là hủy cấp bách, kiểm tra thêm lý do cấp bách
    if (is_emergency && (!reason.includes('cấp bách') && !reason.includes('khẩn cấp'))) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng nêu rõ lý do cấp bách/khẩn cấp trong nội dung"
      });
    }

    const result = await cancelAppointment(
      appointment_id, 
      doctor_id, 
      reason.trim(), 
      'doctor', 
      is_emergency
    );
    
    return res.status(200).json(result);

  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    console.error("Error in cancelAppointmentController:", error);
    return res.status(500).json({
      success: false,
      error: "Có lỗi xảy ra khi hủy lịch hẹn"
    });
  }
};

export const getAffectedAppointmentsController = async (req, res) => {
  try {
    const { day_off_id } = req.params;
    const doctor_id = req.user.doctor.doctor_id;

    // Kiểm tra quyền truy cập
    const dayOff = await DoctorDayOff.findOne({
      where: { day_off_id, doctor_id }
    });

    if (!dayOff) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ngày nghỉ'
      });
    }

    // Lấy danh sách lịch hẹn bị ảnh hưởng
    const affectedAppointments = await Appointment.findAll({
      include: [
        {
          model: DoctorDayOff,
          through: { where: { day_off_id } },
          as: 'DoctorDayOffs'
        },
        {
          model: Patient,
          as: 'Patient',
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['username', 'email', 'phone_number']
            }
          ]
        },
        {
          model: CompensationCode,
          as: 'CompensationCode',
          required: false
        }
      ],
      where: {
        doctor_id,
        status: 'doctor_day_off'
      }
    });

    res.status(200).json({
      success: true,
      data: affectedAppointments
    });
  } catch (error) {
    console.error('Error getting affected appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy danh sách lịch hẹn bị ảnh hưởng',
      error: error.message
    });
  }
};

// Hàm tạo mã bồi thường ngẫu nhiên
function generateCompensationCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export const createMedicalRecordController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id;
    const { appointment_id, data } = req.body;
    const result = await createMedicalRecord(doctor_id, appointment_id, data);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};
export const completeAppointmentController = async (req, res) => {
  try {
    const { appointment_id } = req.body;
    const doctor_id = req.user.user_id;
    
    if (!appointment_id) {
      throw new BadRequestError("Thiếu mã cuộc hẹn");
    }

    const result = await completeAppointment(appointment_id, doctor_id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in completeAppointmentController:', error);
    
    if (error instanceof BadRequestError) {
      res.status(400).json({ success: false, message: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Có lỗi xảy ra khi hoàn thành cuộc hẹn",
        error: error.message 
      });
    }
  }
};

export const createPrescriptionsController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id;
    const { appointment_id, note, medicines } = req.body;

    const result = await createMedicines(appointment_id, doctor_id, note, medicines);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in createMedicinesController:', error);
    
    if (error instanceof BadRequestError) {
      res.status(400).json({ success: false, message: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Có lỗi xảy ra khi tạo đơn thuốc",
        error: error.message 
      });
    }
  }
};