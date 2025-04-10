import {
  registerPatient,
  loginPatient,
  getAllSpecializations,
  getAllDoctors,
  getDoctorProfile,
  bookAppointment,
} from "../services/patientService.js";
import BadRequestError from "../errors/bad_request.js";
import UnauthorizedError from "../errors/unauthorized.js";
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
    // } else if (error instanceof NotFoundError) {
    //   next(error);
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

export const bookAppointmentController = async (req, res, next) => {
  try {
    const { doctor_id, appointment_datetime } = req.body;
    const user_id = req.user.user_id;
    const result = await bookAppointment(user_id, doctor_id, appointment_datetime);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
