import {
  registerDoctor,
  loginDoctor,
  updateDoctorProfile,
  getAllMedicines,
  createDoctorDayOff,
  createPrescriptions,  
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
  getAppointmentPayments,
  updatePaymentStatus,
  getAllPatient,
  getPatientAppointment,
  getDoctorProfile
} from "../services/doctorService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";
import asyncHandler from "express-async-handler";
import NotFoundError from "../errors/not_found.js";
import { Op } from "sequelize";
import dayjs from "dayjs";

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
export const getDoctorDayOffsController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id;
    const { start, end, status, date } = req.query;

    const result = await getDoctorDayOffs(doctor_id, start, end, status, date);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getDoctorDayOffsController:', error);
    
    if (error.name === 'BadRequestError') {
      return res.status(400).json({
        success: false,
        message: error.message || "Yêu cầu không hợp lệ"
      });
    } else if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        message: error.message || "Không tìm thấy dữ liệu"
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi lấy danh sách ngày nghỉ",
        error: error.message
      });
    }
  }
};
export const createDoctorDayOffController = async (req, res) => {
  try {
    const { off_date, time_off, reason, is_emergency } = req.body;
    const doctor_id = req.user.user_id;

    // Gọi service với doctor_id đã lấy đúng
    const result = await createDoctorDayOff(doctor_id, off_date, time_off, reason);
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Error creating doctor day off:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tạo ngày nghỉ',
      error: error.message
    });
  }
};
export const cancelDoctorDayOffController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id; // Lấy từ token
    const day_off_id = req.params.id;
    const { time_off } = req.body;

    if (!time_off) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin buổi nghỉ cần hủy"
      });
    }

    // Gọi service cancelDoctorDayOff để xử lý
    const result = await cancelDoctorDayOff(doctor_id, day_off_id, time_off);

    // Trả về kết quả cho người dùng
    res.status(200).json(result);
  } catch (error) {
    console.error('Error canceling doctor day off:', error);
    
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        message: error.message || "Không tìm thấy ngày nghỉ"
      });
    } else if (error.name === 'BadRequestError') {
      return res.status(400).json({
        success: false,
        message: error.message || "Yêu cầu không hợp lệ"
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi hủy ngày nghỉ",
        error: error.message
      });
    }
  }
};
export const cancelAppointmentController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id;
    const appointment_id = parseInt(req.params.id);
    const { reason } = req.body;

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

    const result = await cancelAppointment(
      appointment_id, 
      doctor_id, 
      reason.trim(), 
      'doctor'
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
    const { appointment_id, diagnosis, treatment, notes } = req.body;

    if (!appointment_id) {
      throw new BadRequestError("Thiếu mã cuộc hẹn");
    }

    const result = await createMedicalRecord(doctor_id, appointment_id, {
      diagnosis,
      treatment,
      notes
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in createMedicalRecordController:', error);
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Có lỗi xảy ra khi tạo hồ sơ bệnh án",
        error: error.message 
      });
    }
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

export const createPrescriptionsController = asyncHandler(async (req, res) => {
  const { appointment_id, note, medicines, use_hospital_pharmacy } = req.body;
  const doctor_id = req.user.user_id;

  if (use_hospital_pharmacy === undefined) {
    throw new BadRequestError("Vui lòng chỉ định có sử dụng nhà thuốc bệnh viện hay không");
  }

  const result = await createPrescriptions(
    appointment_id,
    doctor_id,
    note,
    medicines,
    use_hospital_pharmacy
  );

  res.status(201).json(result);
});

/**
 * Lấy danh sách thanh toán của các cuộc hẹn
 */
export const getAppointmentPaymentsController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id;
    const { 
      page = 1, 
      limit = 10, 
      payment_status, 
      start_date, 
      end_date, 
      date 
    } = req.query;

    // Validate input
    if (page && (isNaN(page) || page < 1)) {
      throw new BadRequestError("Số trang không hợp lệ");
    }

    if (limit && (isNaN(limit) || limit < 1)) {
      throw new BadRequestError("Giới hạn số lượng không hợp lệ");
    }

    if (date && !dayjs(date).isValid()) {
      throw new BadRequestError("Ngày không hợp lệ");
    }

    if (start_date && !dayjs(start_date).isValid()) {
      throw new BadRequestError("Ngày bắt đầu không hợp lệ");
    }

    if (end_date && !dayjs(end_date).isValid()) {
      throw new BadRequestError("Ngày kết thúc không hợp lệ");
    }

    if (start_date && end_date && dayjs(end_date).isBefore(dayjs(start_date))) {
      throw new BadRequestError("Ngày kết thúc phải sau ngày bắt đầu");
    }

    const result = await getAppointmentPayments(
      doctor_id, 
      {
        payment_status,
        start_date,
        end_date,
        date
      }, 
      parseInt(page), 
      parseInt(limit)
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getAppointmentPaymentsController:', error);
    if (error instanceof BadRequestError) {
      res.status(400).json({ success: false, message: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Có lỗi xảy ra khi lấy danh sách thanh toán",
        error: error.message 
      });
    }
  }
};

/**
 * Cập nhật trạng thái thanh toán
 */
export const updatePaymentStatusController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id;
    const { payment_id } = req.params;
    const { status, note } = req.body;

    if (!payment_id) {
      throw new BadRequestError("Thiếu mã thanh toán");
    }

    if (!status) {
      throw new BadRequestError("Thiếu trạng thái thanh toán");
    }

    const result = await updatePaymentStatus(doctor_id, payment_id, status, note);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updatePaymentStatusController:', error);
    if (error instanceof BadRequestError) {
      res.status(400).json({ success: false, message: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Có lỗi xảy ra khi cập nhật trạng thái thanh toán",
        error: error.message 
      });
    }
  }
};
export const getAllMedicinesController = asyncHandler(async (req, res) => {
  const { search, expiry_before } = req.query;
  const result = await getAllMedicines({ search, expiry_before });
  res.status(200).json(result);
});

/**
 * Lấy danh sách tất cả bệnh nhân
 */
export const getAllPatientsController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id;
    const { search, page = 1, limit = 10 } = req.query;

    // Validate parameters
    if (page && (isNaN(page) || parseInt(page) < 1)) {
      return res.status(400).json({
        success: false,
        message: "Số trang không hợp lệ"
      });
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1)) {
      return res.status(400).json({
        success: false,
        message: "Số lượng mỗi trang không hợp lệ"
      });
    }

    const result = await getAllPatient(doctor_id, {
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getAllPatientsController:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi lấy danh sách bệnh nhân"
    });
  }
};

/**
 * Lấy danh sách lịch hẹn của một bệnh nhân cụ thể
 */
export const getPatientAppointmentsController = async (req, res) => {
  try {
    const doctor_id = req.user.user_id;
    const { patient_id } = req.params;
    const { status, start_date, end_date, page = 1, limit = 10 } = req.query;

    // Validate patient_id
    if (!patient_id || isNaN(patient_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã bệnh nhân không hợp lệ"
      });
    }

    // Validate pagination parameters
    if (page && (isNaN(page) || parseInt(page) < 1)) {
      return res.status(400).json({
        success: false,
        message: "Số trang không hợp lệ"
      });
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1)) {
      return res.status(400).json({
        success: false,
        message: "Số lượng mỗi trang không hợp lệ"
      });
    }

    // Validate date parameters
    if (start_date && !dayjs(start_date).isValid()) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu không hợp lệ"
      });
    }

    if (end_date && !dayjs(end_date).isValid()) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc không hợp lệ"
      });
    }

    if (start_date && end_date && dayjs(end_date).isBefore(dayjs(start_date))) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc phải sau ngày bắt đầu"
      });
    }

    const result = await getPatientAppointment(
      doctor_id,
      patient_id,
      {
        status,
        start_date,
        end_date,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getPatientAppointmentsController:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi lấy danh sách cuộc hẹn của bệnh nhân"
    });
  }
};

export const getDoctorProfileController = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const result = await getDoctorProfile(user_id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.user
    });
  } catch (error) {
    console.error('Error in getDoctorProfileController:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy thông tin bác sĩ",
      error: error.message
    });
  }
};