import db from "../models/index.js";
import ForbiddenError from "../errors/forbidden.js";
import NotFoundError from "../errors/not_found.js";

const { Appointment } = db;
// Chỉ cho phép bác sĩ thao tác với appointment thuộc về chính mình
/**
 * Middleware kiểm tra xem bác sĩ hiện tại có sở hữu lịch hẹn không
 * @param {string} paramName - tên param chứa appointment_id (mặc định là "id")
 */
const checkDoctorOwnsAppointment = (paramName = "id") => {
  return async (req, res, next) => {
    const doctor_id = req.user.user_id; // ID người dùng hiện tại
    const appointment_id = req.params[paramName];

    const appointment = await Appointment.findByPk(appointment_id);

    if (!appointment) {
      throw new NotFoundError("Lịch hẹn không tồn tại");
    }

    // Kiểm tra appointment có thuộc về bác sĩ hiện tại không
    if (appointment.doctor_id !== doctor_id) {
      throw new ForbiddenError("Bạn không có quyền truy cập lịch hẹn này");
    }

    next();
  };
};

export default checkDoctorOwnsAppointment;
