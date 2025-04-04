import {
  registerDoctor,
  loginDoctor,
  updateDoctorProfile,
  createDoctorDayOff,
  // cancelDoctorDayOff,
  getDoctorAppointments,
  getDoctorSummary,
  getDoctorAppointmentStats,
  getAppointmentDetails,
  acceptAppointment,
  cancelAppointment,
  markPatientNotComing,
  completeAppointment,
  getDoctorDayOffs,
  createMedicalRecord
} from "../services/doctorService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";
import asyncHandler from "express-async-handler";
import NotFoundError from "../errors/not_found.js";

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
  const appointment_id = req.params.id;

  const result = await acceptAppointment(appointment_id, doctor_id);
  res.status(200).json(result);
});
export const cancelAppointmentController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id;
  const appointment_id = req.params.id;

  const result = await cancelAppointment(appointment_id, doctor_id);

  res.status(200).json(result);
});
export const markPatientNotComingController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id;
  const appointment_id = req.params.id;

  const result = await markPatientNotComing(appointment_id, doctor_id);
  res.status(200).json(result);
});
export const completeAppointmentController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id;
  const appointment_id = req.params.id;
  const result = await completeAppointment(appointment_id, doctor_id);
  res.status(200).json(result);
});
export const getDoctorDayOffsController = asyncHandler(async (req, res, next) => {
  try {
    const doctor_id = req.user.user_id;
    const { start, end } = req.query;

    const result = await getDoctorDayOffs(doctor_id, start, end);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
});
export const createDoctorDayOffController = asyncHandler(async (req, res) => {
  const doctor_id = req.user.user_id;

  if (!doctor_id) {
    res.status(401); // Unauthorized
    throw new Error('Không tìm thấy thông tin bác sĩ từ token');
  }

  const { off_date, time_off, reason } = req.body;

  const result = await createDoctorDayOff(doctor_id, off_date, time_off, reason);

  if (result.success) {
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } else {
    res.status(400);
    throw new Error(result.message || 'Đã có lỗi xảy ra khi đăng ký ngày nghỉ');
  }
});
// export const cancelDoctorDayOffController = asyncHandler(async (req, res) => {
//   const doctor_id = req.user.user_id;
//   const day_off_id = req.params.id;
//   const { time_off } = req.body;

//   const result = await cancelDoctorDayOff(doctor_id, day_off_id, time_off);

//   res.status(200).json(result);
// });