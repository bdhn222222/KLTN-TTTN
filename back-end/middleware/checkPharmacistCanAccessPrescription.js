import db from "../models/index.js";
import ForbiddenError from "../errors/forbidden.js";
import NotFoundError from "../errors/not_found.js";

const { Prescription, Appointment, Payment } = db;

const checkPharmacistCanAccessPrescription = (paramName = "id") => {
  return async (req, res, next) => {
    const prescription_id = req.params[paramName];

    const prescription = await Prescription.findByPk(prescription_id, {
      include: {
        model: Appointment,
        as: "appointment",
        include: {
          model: Payment,
          as: "payments",
        },
      },
    });

    if (!prescription) {
      throw new NotFoundError("Đơn thuốc không tồn tại");
    }

    const appointment = prescription.appointment;

    if (!appointment || appointment.status !== "completed") {
      throw new ForbiddenError("Đơn thuốc chưa hoàn tất khám");
    }

    const hasPaid = appointment.payments?.some((p) => p.status === "paid");
    if (!hasPaid) {
      throw new ForbiddenError("Bệnh nhân chưa thanh toán khám bệnh");
    }

    next();
  };
};

export default checkPharmacistCanAccessPrescription;
