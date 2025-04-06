import {
  registerPatient,
  loginPatient,
  getAllSpecializations,
  getAllDoctors,
  getDoctorProfile,
  bookAppointment,
  applyCompensationCode,
  getPatientCompensationCodes,
} from "../services/patientService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";
import asyncHandler from "express-async-handler";

export const registerPatientController = async (req, res, next) => {
  try {
    const patient = await registerPatient(req.body);
    res.status(201).json(patient);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
export const loginPatientController = async (req, res, next) => {
  try {
    const patient = await loginPatient(req.body);
    res.status(200).json(patient);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
export const getAllSpecializationsController = asyncHandler(
  async (req, res) => {
    const result = await getAllSpecializations();
    res.status(200).json(result);
  }
);
export const getAllDoctorsController = asyncHandler(async (req, res) => {
  const result = await getAllDoctors();
  res.status(200).json(result);
});
export const getDoctorProfileController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await getDoctorProfile(id);
  res.status(200).json(result);
});
export const bookAppointmentController = asyncHandler(async (req, res) => {
  const patient_id = req.user.user_id;
  const { doctor_id, appointment_datetime } = req.body;

  if (!doctor_id || !appointment_datetime) {
    throw new BadRequestError("Thiếu thông tin đặt lịch");
  }

  const result = await bookAppointment(
    patient_id,
    doctor_id,
    appointment_datetime
  );
  res.status(201).json(result);
});

/**
 * Controller xử lý việc áp dụng mã bồi thường cho lịch hẹn mới
 */
export const applyCompensationCodeController = async (req, res) => {
  try {
    const { code, appointment_id } = req.body;
    const patient_id = req.user.patient.patient_id;

    // Tìm mã bồi thường
    const compensationCode = await CompensationCode.findOne({
      where: {
        code,
        patient_id,
        is_used: false
      }
    });

    if (!compensationCode) {
      return res.status(404).json({
        success: false,
        message: 'Mã bồi thường không tồn tại hoặc đã được sử dụng'
      });
    }

    // Kiểm tra hạn sử dụng
    if (new Date() > compensationCode.expiry_date) {
      return res.status(400).json({
        success: false,
        message: 'Mã bồi thường đã hết hạn'
      });
    }

    // Kiểm tra lịch hẹn
    const appointment = await Appointment.findOne({
      where: {
        appointment_id,
        patient_id,
        status: 'waiting_for_confirmation'
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn hoặc lịch hẹn không ở trạng thái chờ xác nhận'
      });
    }

    // Áp dụng mã bồi thường
    const discountedFees = appointment.fees * (1 - compensationCode.discount_percentage / 100);
    await appointment.update({
      fees: discountedFees
    });

    // Cập nhật trạng thái mã bồi thường
    await compensationCode.update({
      is_used: true,
      used_appointment_id: appointment_id
    });

    res.status(200).json({
      success: true,
      message: 'Áp dụng mã bồi thường thành công',
      data: {
        originalFees: appointment.fees,
        discountedFees,
        discountPercentage: compensationCode.discount_percentage
      }
    });
  } catch (error) {
    console.error('Error applying compensation code:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi áp dụng mã bồi thường',
      error: error.message
    });
  }
};

/**
 * Controller xử lý việc lấy danh sách mã bồi thường của bệnh nhân
 */
export const getPatientCompensationCodesController = async (req, res) => {
  try {
    const patient_id = req.user.patient.patient_id;

    const compensationCodes = await CompensationCode.findAll({
      where: { patient_id },
      include: [
        {
          model: Appointment,
          as: 'Appointment',
          attributes: ['appointment_datetime', 'fees', 'status']
        },
        {
          model: Doctor,
          as: 'Doctor',
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['username', 'email']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: compensationCodes
    });
  } catch (error) {
    console.error('Error getting patient compensation codes:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi lấy danh sách mã bồi thường',
      error: error.message
    });
  }
};
