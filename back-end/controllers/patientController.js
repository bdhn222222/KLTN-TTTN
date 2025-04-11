import {
  registerPatient,
  loginPatient,
  getAllSpecializations,
  getAllDoctors,
  getDoctorProfile,
  bookAppointment,
  verifyEmail,
  changePassword,
} from "../services/patientService.js";
import BadRequestError from "../errors/bad_request.js";
import UnauthorizedError from "../errors/unauthorized.js";
import InternalServerError from "../errors/internalServerError.js";
import asyncHandler from "express-async-handler";


export const registerPatientController = async (req, res, next) => {
  try {
    const patient = await registerPatient(req.body);
    console.log(patient);
    res.status(201).json(patient);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};

export const verifyEmailController = async (req, res, next) => {
  try {
    const { email, otp_code } = req.query;
    const result = await verifyEmail(email, otp_code);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export const changePasswordController = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      throw new BadRequestError("Missing required fields");
    }

    if (old_password === new_password) {
      throw new BadRequestError(
        "New password must be different from old password."
      );
    }

    const result = await changePassword(
      user_id,
      old_password,
      new_password
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
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
