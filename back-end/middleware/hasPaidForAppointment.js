import db from "../models/index.js";
import NotFoundError from "../errors/not_found.js";
import ForbiddenError from "../errors/forbidden.js";

const { Appointment, Payment } = db;

const hasPaidForAppointment = (paramName = "id") => {
  return async (req, res, next) => {
    const appointment_id = req.params[paramName];
    const user_id = req.user.user_id;
    const role = req.user.role;

    if (role !== "patient") {
      throw new ForbiddenError("Chỉ bệnh nhân mới có quyền xem thông tin này");
    }

    const appointment = await Appointment.findByPk(appointment_id, {
      include: { model: Payment, as: "payments" },
    });

    if (!appointment) {
      throw new NotFoundError("Lịch hẹn không tồn tại");
    }

    // So sánh ID bệnh nhân
    if (appointment.patient_id !== req.user.user_id) {
      throw new ForbiddenError("Bạn không có quyền truy cập lịch hẹn này");
    }

    const hasPaid = appointment.payments?.some((p) => p.status === "paid");

    if (!hasPaid) {
      throw new ForbiddenError(
        "Bạn cần thanh toán lịch hẹn để xem thông tin này"
      );
    }

    next();
  };
};

export default hasPaidForAppointment;
