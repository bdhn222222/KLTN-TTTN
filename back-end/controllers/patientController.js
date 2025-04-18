import {
  registerPatient,
  loginPatient,
  getAllSpecializations,
  getAllDoctors,
  getDoctorProfile,
  bookAppointment,
  verifyEmail,
  changePassword,
  addFamilyMember,
  getFamilyMembers,
  getFamilyMemberById,
  updateFamilyMember,
  deleteFamilyMember,
  getAllAppointments,
  //  bookSymptomsAppointment,
  getDoctorBySymptoms,
  getAllSymptoms,
  getDoctorDayOff,
  cancelAppointment,
  getAppointmentById,
} from "../services/patientService.js";
import BadRequestError from "../errors/bad_request.js";
import UnauthorizedError from "../errors/unauthorized.js";
import InternalServerError from "../errors/internalServerError.js";
import NotFoundError from "../errors/not_found.js";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import db from "../models/index.js";
import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

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

export const bookAppointmentController = async (req, res) => {
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

    const result = await bookAppointment(
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

export const getAppointmentByIdController = asyncHandler(
  async (req, res, next) => {
    try {
      const appointment = await getAppointmentById(
        req.params.id,
        req.user.user_id
      );
      res.status(200).json(appointment);
    } catch (error) {
      next(error);
    }
  }
);

export const processPaymentController = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_method, amount } = req.body;
    const user_id = req.user.user_id;

    // Kiểm tra appointment có tồn tại và thuộc về user không
    const appointment = await getAppointmentById(id, user_id);
    if (!appointment.success) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    // Kiểm tra trạng thái appointment
    if (appointment.data.data.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Lịch hẹn chưa hoàn thành, không thể thanh toán",
      });
    }

    // Kiểm tra đã thanh toán chưa
    const isPaid =
      appointment.data.data.Payments &&
      appointment.data.data.Payments.length > 0 &&
      appointment.data.data.Payments[0].status === "paid";

    if (isPaid) {
      return res.status(400).json({
        success: false,
        message: "Lịch hẹn đã được thanh toán",
      });
    }

    // Xử lý thanh toán MoMo
    if (payment_method === "momo") {
      const accessKey = process.env.MOMO_ACCESS_KEY;
      const secretKey = process.env.MOMO_SECRET_KEY;
      const partnerCode = process.env.MOMO_PARTNER_CODE;
      const redirectUrl = process.env.CLIENT_URL + "/patient/payment/" + id;
      const ipnUrl = process.env.SERVER_URL + "/api/payment/callback";
      const requestId = partnerCode + new Date().getTime();
      const orderId = requestId;
      const orderInfo = "Thanh toán lịch hẹn #" + id;
      const requestType = "payWithMethod";
      const extraData = "";

      // Tạo chữ ký
      const rawSignature =
        "accessKey=" +
        accessKey +
        "&amount=" +
        amount +
        "&extraData=" +
        extraData +
        "&ipnUrl=" +
        ipnUrl +
        "&orderId=" +
        orderId +
        "&orderInfo=" +
        orderInfo +
        "&partnerCode=" +
        partnerCode +
        "&redirectUrl=" +
        redirectUrl +
        "&requestId=" +
        requestId +
        "&requestType=" +
        requestType;

      const signature = crypto
        .createHmac("sha256", secretKey)
        .update(rawSignature)
        .digest("hex");

      // Tạo payment record
      await db.Payment.create({
        appointment_id: id,
        amount: amount,
        payment_method: "momo",
        status: "pending",
        order_id: orderId,
      });

      // Request đến MoMo API
      const requestBody = {
        partnerCode: partnerCode,
        partnerName: "Book Doctor",
        storeId: "BookDoctorStore",
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        lang: "vi",
        requestType: requestType,
        autoCapture: true,
        extraData: extraData,
        orderGroupId: "",
        signature: signature,
      };

      const momoResponse = await axios.post(
        "https://test-payment.momo.vn/v2/gateway/api/create",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: "Tạo giao dịch thanh toán thành công",
        payUrl: momoResponse.data.payUrl,
        orderId: orderId,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không được hỗ trợ",
      });
    }
  } catch (error) {
    console.error("Lỗi xử lý thanh toán:", error);
    next(error);
  }
});

export const verifyPaymentController = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { order_id } = req.body;
    const user_id = req.user.user_id;

    // Kiểm tra appointment có tồn tại và thuộc về user không
    const appointment = await getAppointmentById(id, user_id);
    if (!appointment.success) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    // Kiểm tra payment record
    const payment = await db.Payment.findOne({
      where: {
        appointment_id: id,
        order_id: order_id,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch thanh toán",
      });
    }

    // Nếu đã xác nhận thanh toán rồi
    if (payment.status === "paid") {
      return res.status(200).json({
        success: true,
        message: "Giao dịch đã được xác nhận thanh toán trước đó",
      });
    }

    // Kiểm tra trạng thái giao dịch từ MoMo
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const requestId = partnerCode + new Date().getTime();

    const rawSignature =
      "accessKey=" +
      accessKey +
      "&orderId=" +
      order_id +
      "&partnerCode=" +
      partnerCode +
      "&requestId=" +
      requestId;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode: partnerCode,
      requestId: requestId,
      orderId: order_id,
      signature: signature,
      lang: "vi",
    };

    const momoResponse = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/query",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (
      momoResponse.data.resultCode === 0 &&
      momoResponse.data.amount == payment.amount
    ) {
      // Cập nhật trạng thái thanh toán
      payment.status = "paid";
      payment.transaction_id = momoResponse.data.transId;
      payment.paid_at = new Date();
      await payment.save();

      return res.status(200).json({
        success: true,
        message: "Xác nhận thanh toán thành công",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Giao dịch chưa được thanh toán hoặc số tiền không đúng",
        details: momoResponse.data,
      });
    }
  } catch (error) {
    console.error("Lỗi xác nhận thanh toán:", error);
    next(error);
  }
});

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

export const getDoctorDayOffController = async (req, res, next) => {
  try {
    const { doctor_id } = req.params;

    if (!doctor_id) {
      throw new BadRequestError("Thiếu thông tin ID bác sĩ");
    }

    const result = await getDoctorDayOff(doctor_id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getDoctorBySymptomsController = async (req, res, next) => {
  try {
    const {
      symptoms,
      appointment_datetime,
      family_member_id,
      family_member_data,
    } = req.body;

    const user_id = req.user.user_id;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      throw new BadRequestError("Vui lòng cung cấp ít nhất một triệu chứng");
    }

    if (!appointment_datetime) {
      throw new BadRequestError("Vui lòng cung cấp thời gian đặt lịch");
    }

    if (family_member_id && !family_member_data) {
      throw new BadRequestError("Vui lòng cung cấp thông tin người thân");
    }

    if (family_member_data) {
      const requiredFields = ["username", "dob", "phone_number", "gender"];
      const missingFields = requiredFields.filter(
        (field) => !family_member_data[field]
      );
      if (missingFields.length > 0) {
        throw new BadRequestError(
          `Thiếu thông tin bắt buộc: ${missingFields.join(", ")}`
        );
      }
    }

    const result = await getDoctorBySymptoms(
      user_id,
      symptoms,
      appointment_datetime,
      family_member_id,
      family_member_data
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const cancelAppointmentController = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const appointment_id = parseInt(req.params.id);
    const { reason } = req.body;

    // Kiểm tra appointment_id
    if (!appointment_id || isNaN(appointment_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã cuộc hẹn không hợp lệ",
      });
    }

    // Kiểm tra reason
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập lý do hủy lịch",
      });
    }

    // Kiểm tra độ dài reason
    if (reason.trim().length < 3 || reason.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: "Lý do phải từ 3 đến 200 ký tự",
      });
    }

    const result = await cancelAppointment(
      user_id,
      appointment_id,
      reason.trim()
    );
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in cancelAppointmentController:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi hủy lịch hẹn",
    });
  }
};
