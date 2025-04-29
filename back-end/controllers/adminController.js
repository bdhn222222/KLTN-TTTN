import * as adminService from "../services/adminService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";
import asyncHandler from "express-async-handler";
import NotFoundError from "../errors/not_found.js";
import { validationResult } from "express-validator";
export const registerAdminController = async (req, res, next) => {
  try {
    const admin = await adminService.registerAdmin(req.body);
    res.status(201).json(admin);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
export const loginAdminController = async (req, res, next) => {
  try {
    const admin = await adminService.loginAdmin(req.body);
    res.status(200).json(admin);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
export async function addSpecializationController(req, res) {
  try {
    const { name, fees } = req.body;
    const imageFile = req.file?.path; // đường dẫn tạm do multer lưu

    if (!name || fees == null) {
      throw new BadRequestError("Thiếu tên hoặc phí chuyên khoa");
    }

    await adminService.createSpecialization(name, Number(fees), imageFile);

    return res.status(201).json({
      success: true,
      message: "Tạo chuyên khoa thành công",
    });
  } catch (err) {
    console.error("Error in addSpecializationController:", err);
    if (err instanceof BadRequestError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({
      success: false,
      message: "Xảy ra lỗi khi tạo chuyên khoa",
    });
  }
}

export const getAllPatientsController = asyncHandler(async (req, res) => {
  try {
    const result = await adminService.getAllPatients();
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }
    // fallback
    console.error("Error in getAllPatientsController:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});
export const getPatientAppointmentsController = async (req, res, next) => {
  try {
    const patient_id = parseInt(req.params.patient_id, 10);
    const result = await adminService.getPatientAppointments(patient_id);
    return res.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
};
export const getAllAppointmentsController = async (req, res, next) => {
  try {
    // req.query có thể có: ?appointmentStatus=accepted,completed&paymentStatus=paid
    const { appointmentStatus, paymentStatus } = req.query;
    const result = await adminService.getAllAppointments({
      appointmentStatus,
      paymentStatus,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.name === "NotFoundError") {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
};
export const getAllMedicinesController = async (req, res, next) => {
  try {
    const { search, page, limit, sortField, sortOrder } = req.query;
    const result = await adminService.getAllMedicines({
      search,
      page,
      limit,
      sortField,
      sortOrder,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
export const getAppointmentDetailsController = async (req, res, next) => {
  try {
    const appointment_id = parseInt(req.params.appointment_id, 10);
    if (isNaN(appointment_id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid appointment_id" });
    }

    const appointment = await adminService.getAppointmentDetails(
      appointment_id
    );
    return res.json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
};
export const updatePaymentStatusController = async (req, res, next) => {
  try {
    const payment_id = parseInt(req.params.payment_id, 10);
    const { status, note } = req.body;
    if (!payment_id) throw new BadRequestError("Thiếu payment_id");

    const result = await adminService.updatePaymentStatus({
      payment_id,
      status,
      note,
    });
    return res.json(result);
  } catch (err) {
    if (err instanceof BadRequestError)
      return res.status(400).json({ success: false, message: err.message });
    if (err instanceof NotFoundError)
      return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
};

export const getAllSpecializationsController = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await adminService.getAllSpecializations({
      page,
      limit,
      search,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
};
export const getSpecializationDetailsController = asyncHandler(
  async (req, res) => {
    const specialization_id = parseInt(req.params.specialization_id, 10);
    const result = await adminService.getSpecializationDetails({
      specialization_id,
    });
    res.json(result);
  }
);

export const getDoctorDetailsController = async (req, res, next) => {
  try {
    const doctorId = Number(req.params.doctor_id);
    if (isNaN(doctorId) || doctorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }
    const doctor = await adminService.getDoctorDetails(doctorId);
    return res.status(200).json({ success: true, data: doctor });
  } catch (err) {
    next(err);
  }
};

export const updateSpecializationController = async (req, res, next) => {
  try {
    const specialization_id = parseInt(req.params.specialization_id, 10);
    if (isNaN(specialization_id)) {
      throw new BadRequestError("ID chuyên khoa không hợp lệ");
    }

    const result = await adminService.updateSpecialization(
      specialization_id,
      req.body,
      req.file
    );
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
export const getAllDoctorsController = async (req, res, next) => {
  try {
    const doctors = await adminService.getAllDoctors();
    return res.status(200).json({
      success: true,
      data: doctors,
    });
  } catch (err) {
    if (err.name === "NotFoundError") {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};
export const getDoctorDayOffController = async (req, res, next) => {
  try {
    const doctorId = Number(req.params.doctor_id);
    if (isNaN(doctorId) || doctorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const schedule = await adminService.getDoctorDayOff(doctorId);
    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
};
export const createDoctorController = async (req, res, next) => {
  try {
    const result = await adminService.addDoctor(req.body);
    return res.status(201).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    if (err.name === "BadRequestError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};
export const updateMedicineDetailsController = async (req, res, next) => {
  try {
    const medicineId = Number(req.params.medicine_id);
    if (isNaN(medicineId) || medicineId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID",
      });
    }

    // Chỉ cho phép các field hợp lệ được update
    const allowed = [
      "name",
      "description",
      "quantity",
      "price",
      "unit",
      "expiry_date",
      "supplier",
    ];
    const payload = {};
    for (const key of allowed) {
      if (key in req.body) payload[key] = req.body[key];
    }

    const updatedMedicine = await adminService.updateMedicineDetails(
      medicineId,
      payload
    );

    return res.status(200).json({
      success: true,
      data: updatedMedicine,
    });
  } catch (err) {
    if (err.name === "NotFoundError") {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
};
export const getMedicineDetailsController = async (req, res, next) => {
  try {
    const id = Number(req.params.medicine_id);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid medicine ID" });
    }
    const medicine = await adminService.getMedicineDetails(id);
    return res.status(200).json({ success: true, data: medicine });
  } catch (err) {
    if (err.name === "NotFoundError") {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
};

export const createMedicineController = async (req, res, next) => {
  // Validate body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const newMed = await adminService.createMedicine(req.body);
    return res.status(201).json({ success: true, data: newMed });
  } catch (err) {
    if (err.name === "BadRequestError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};
export const getKpiController = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const kpi = await adminService.getKpi(start, end);

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin KPI thành công",
      data: {
        ...kpi,
        revenue: {
          ...kpi.revenue,
          value: `${kpi.revenue.value.toLocaleString("vi-VN")} VNĐ`,
        },
      },
    });
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};
export const getTotalPatientsController = async (req, res, next) => {
  try {
    const { filter, date, month, year } = req.query;
    const result = await adminService.getTotalPatients({
      filter,
      date,
      month,
      year,
    });
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err.name === "BadRequestError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

export const getAppointmentStatsController = async (req, res, next) => {
  try {
    const { period } = req.query; // Validate period if provided

    if (period && !["weekly", "monthly", "yearly"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period. Must be one of: weekly, monthly, yearly",
      });
    }

    const data = await adminService.getAppointmentStats(period);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error in getAppointmentStatsController:", err); // Log the error // Handle specific errors

    if (err instanceof BadRequestError) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    } // For unexpected errors

    return res.status(500).json({
      success: false,
      message: "Internal server error while getting appointment statistics",
    });
  }
};
export const acceptAppointmentAdminController = async (req, res, next) => {
  try {
    const appointment_id = parseInt(req.params.appointment_id, 10);
    if (isNaN(appointment_id)) {
      throw new BadRequestError("Invalid appointment_id");
    }

    const payload = {};
    const { doctor_id, appointment_datetime } = req.body;
    if (doctor_id) payload.doctor_id = doctor_id;
    if (appointment_datetime)
      payload.appointment_datetime = appointment_datetime;

    const result = await adminService.acceptAppointmentByAdmin(
      appointment_id,
      payload
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
};
export const cancelAppointmentController = async (req, res, next) => {
  try {
    const appointment_id = parseInt(req.params.appointment_id, 10);
    if (isNaN(appointment_id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid appointment_id" });
    }

    const { reason } = req.body;
    const user_id = req.user.user_id; // lấy từ JWT middleware
    // console.log("Cancelled by from controller: ", cancelled_by);

    const result = await adminService.cancelAppointmentByAdmin({
      appointment_id,
      reason,
      user_id,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
};
export const updateAppointmentController = asyncHandler(async (req, res) => {
  const appointment_id = parseInt(req.params.appointment_id, 10);
  const updateData = req.body;
  const result = await adminService.updateAppointmentByAdmin(
    appointment_id,
    updateData
  );
  res.json(result);
});
export const getDoctorbySpecializationController = async (req, res, next) => {
  try {
    const specialization_id = parseInt(req.params.specialization_id, 10);
    const result = await adminService.getDoctorbySpecialization(
      specialization_id
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
