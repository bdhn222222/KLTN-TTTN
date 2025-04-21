import * as adminService from "../services/adminService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";
import asyncHandler from "express-async-handler";
import NotFoundError from "../errors/not_found.js";

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
    const result = await adminService.getAllAppointments();
    res.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
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
export const getDoctorDetailsController = asyncHandler(async (req, res) => {
  const doctor_id = parseInt(req.params.doctor_id, 10);
  const result = await adminService.getDoctorDetails({ doctor_id });
  res.json(result);
});
export const getSpecializationDetailsCotroller = async (req, res) => {
  const specialization_id = parseInt(req.params.specialization_id, 10);
  const { name, fees, image } = req.body;
  try {
    const result = await adminService.getSpecializationDetails({
      specialization_id,
      name,
      fees,
      image,
    });
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
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
