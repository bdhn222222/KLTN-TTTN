import {
  registerPatient,
  loginPatient,
  getAllSpecializations,
  getAllDoctors,
  getDoctorProfile,
  bookDoctorAppointment,
  verifyEmail,
  changePassword,
  addFamilyMember,
  getFamilyMembers,
  getFamilyMemberById,
  updateFamilyMember,
  deleteFamilyMember,
  getAllAppointments,
  bookSymptomsAppointment,
  getAllSymptoms,
} from "../services/patientService.js";
import BadRequestError from "../errors/bad_request.js";
import UnauthorizedError from "../errors/unauthorized.js";
import InternalServerError from "../errors/internalServerError.js";
import asyncHandler from "express-async-handler";
import NotFoundError from "../errors/not_found.js";
import dayjs from "dayjs";

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
};

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

    const result = await changePassword(user_id, old_password, new_password);
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
  try {
    const { specialization_id } = req.query;
    const result = await getAllDoctors(
      specialization_id ? parseInt(specialization_id) : null
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách bác sĩ",
    });
  }
});

export const getDoctorProfileController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await getDoctorProfile(id);
  res.status(200).json(result);
});

export const bookDoctorAppointmentController = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const {
      doctor_id,
      appointment_datetime,
      family_member_id,
      family_member_data,
    } = req.body;

    // Validate required fields
    if (!doctor_id || !appointment_datetime) {
      throw new BadRequestError("Thiếu thông tin bắt buộc");
    }

    // Validate appointment_datetime format
    if (!dayjs(appointment_datetime).isValid()) {
      throw new BadRequestError("Thời gian đặt lịch không hợp lệ");
    }

    // Validate family_member_data if provided
    if (family_member_data) {
      const { username, dob, phone_number, gender } = family_member_data;
      if (!username || !dob || !phone_number || !gender) {
        throw new BadRequestError("Thiếu thông tin thành viên gia đình");
      }
    }

    const result = await bookDoctorAppointment(
      user_id,
      doctor_id,
      appointment_datetime,
      family_member_id,
      family_member_data
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in bookAppointmentController:", error);
    if (error instanceof BadRequestError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi đặt lịch hẹn",
        error: error.message,
      });
    }
  }
};

export const addFamilyMemberController = async (req, res, next) => {
  const { user_id } = req.user; // Lấy user_id từ token
  const { username, phone_number, email, gender, date_of_birth, relationship } =
    req.body;

  try {
    // Kiểm tra dữ liệu đầu vào
    if (
      !username ||
      !phone_number ||
      !gender ||
      !date_of_birth ||
      !relationship
    ) {
      throw new BadRequestError("Thông tin thành viên gia đình không đầy đủ");
    }

    // Gọi service để thêm thành viên gia đình
    const familyMember = await addFamilyMember(user_id, {
      username,
      phone_number,
      email,
      gender,
      date_of_birth,
      relationship,
    });

    return res.status(201).json({
      success: true,
      message: "Thêm thành viên gia đình thành công",
      data: familyMember,
    });
  } catch (error) {
    next(error);
  }
};

export const getFamilyMembersController = async (req, res, next) => {
  const { user_id } = req.user; // Lấy user_id từ token

  try {
    // Gọi service để lấy các thành viên gia đình
    const familyMembers = await getFamilyMembers(user_id);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thành viên gia đình thành công",
      data: familyMembers,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFamilyMemberController = async (req, res, next) => {
  const { user_id } = req.user; // Lấy user_id từ token
  const { family_member_id } = req.params;
  const { username, phone_number, email, gender, date_of_birth, relationship } =
    req.body;

  try {
    // Kiểm tra dữ liệu đầu vào
    if (
      !username ||
      !phone_number ||
      !gender ||
      !date_of_birth ||
      !relationship
    ) {
      throw new BadRequestError("Tất cả các trường là bắt buộc");
    }

    // Gọi service để cập nhật thông tin thành viên gia đình
    const updatedFamilyMember = await updateFamilyMember(
      user_id,
      family_member_id,
      {
        username,
        phone_number,
        email,
        gender,
        date_of_birth,
        relationship,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật thành viên gia đình thành công",
      data: updatedFamilyMember,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFamilyMemberController = async (req, res, next) => {
  const { user_id } = req.user; // Lấy user_id từ token
  const { family_member_id } = req.params;

  try {
    // Gọi service để xóa thành viên gia đình
    const result = await deleteFamilyMember(user_id, family_member_id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAppointmentsController = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { family_member_id } = req.query;

    const result = await getAllAppointments(
      user_id,
      family_member_id ? parseInt(family_member_id) : null
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const bookSymptomsAppointmentController = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const {
      symptoms,
      appointment_datetime,
      family_member_id,
      family_member_data,
    } = req.body;

    // Validate input
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      throw new Error("Danh sách triệu chứng không hợp lệ");
    }

    if (!appointment_datetime) {
      throw new Error("Thời gian hẹn không được để trống");
    }

    if (!family_member_id) {
      throw new Error("ID thành viên gia đình không được để trống");
    }

    if (!family_member_data) {
      throw new Error("Thông tin thành viên gia đình không được để trống");
    }

    // Validate family member data
    const requiredFields = [
      "username",
      "dob",
      "gender",
      "phone_number",
      //"address",
      //"relationship",
    ];
    const missingFields = requiredFields.filter(
      (field) => !family_member_data[field]
    );
    if (missingFields.length > 0) {
      throw new Error(`Thiếu thông tin bắt buộc: ${missingFields.join(", ")}`);
    }

    // Call service to book appointment
    const appointment = await bookSymptomsAppointment(
      user_id,
      symptoms,
      appointment_datetime,
      family_member_id,
      family_member_data
    );

    res.status(201).json({
      success: true,
      message: "Đặt lịch hẹn thành công",
      data: appointment,
    });
  } catch (error) {
    console.error("Error in bookSymptomsAppointmentController:", error);
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: error.message || "Có lỗi xảy ra khi đặt lịch hẹn",
      });
    }
  }
};

export const getFamilyMemberByIdController = async (req, res, next) => {
  const { user_id } = req.user; // Lấy user_id từ token
  const { family_member_id } = req.params;

  try {
    // Gọi service để lấy thông tin chi tiết của family member
    const familyMember = await getFamilyMemberById(user_id, family_member_id);

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin chi tiết thành viên gia đình thành công",
      data: familyMember,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSymptomsController = async (req, res, next) => {
  try {
    const symptoms = await getAllSymptoms();

    if (!symptoms || symptoms.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Không có triệu chứng nào trong hệ thống",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách triệu chứng thành công",
      data: symptoms,
    });
  } catch (error) {
    console.error("Error in getAllSymptomsController:", error);
    next(error);
  }
};
