import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import UnauthorizedError from "../errors/unauthorized.js";
import NotFoundError from "../errors/not_found.js";
import dayjs from "dayjs";
import { Op } from "sequelize";
import sequelize from "sequelize";
import utc from "dayjs/plugin/utc.js"; // Sử dụng phần mở rộng .js
import timezone from "dayjs/plugin/timezone.js"; // Sử dụng phần mở rộng .js
import { sendVerifyLink } from "../utils/gmail.js";
import CompensationCode from "../models/compensationCode.js";
import { Model, DataTypes } from "sequelize";
import ForbiddenError from "../errors/forbidden.js";
import InternalServerError from "../errors/internalServerError.js";
import * as paymentService from "./paymentService.js";
// Kích hoạt các plugin
dayjs.extend(utc);
dayjs.extend(timezone);

// Ví dụ về sử dụng
const apptTime = dayjs("2025-04-29T16:00:00").tz("Asia/Ho_Chi_Minh", true);
console.log(apptTime.format()); // In ra thời gian đã chuyển đổi

const { User, Patient, MedicalRecord, Doctor, Payment, FamilyMember } = db;

export const registerPatient = async ({
  username,
  email,
  password,
  date_of_birth,
  gender,
  phone_number,
  insurance_number,
  id_number,
  address,
}) => {
  const transaction = await db.sequelize.transaction();

  try {
    const existingPatient = await User.findOne({
      where: { email },
      transaction,
    });

    if (existingPatient) {
      throw new BadRequestError("Email đã được đăng ký");
    }

    // Hash password với bcrypt
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create(
      {
        username,
        email,
        password,
        role: "patient",
      },
      { transaction }
    );

    const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

    const patientData = {
      user_id: newUser.user_id,
      date_of_birth,
      gender,
      phone_number,
      insurance_number,
      id_number,
      address,
      is_verified: false,
      otp_code,
      otp_expiry,
    };

    const newPatient = await Patient.create(patientData, { transaction });

    console.log("Created patient with ID:", newPatient.patient_id);
    console.log("Created user with username:", username);

    try {
      // Tạo mới một bản ghi family member cho chính bệnh nhân với relationship = "me"
      await db.FamilyMember.create(
        {
          patient_id: newPatient.patient_id,
          username: username,
          phone_number,
          email,
          gender,
          date_of_birth,
          relationship: "me",
        },
        { transaction }
      );

      console.log("Created family member for patient");
    } catch (familyMemberError) {
      console.error("Error creating family member:", familyMemberError);
      throw familyMemberError;
    }

    // Skip email sending if in dev environment to test registration
    try {
      const link = `${process.env.URL}/patient/verify?email=${email}&otp_code=${otp_code}`;
      await sendVerifyLink(email, link);
      console.log("Verification email sent to:", email);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      // Continue the registration process even if email sending fails
    }

    await transaction.commit();
    console.log("Transaction committed successfully");

    return {
      message: "Đăng ký account bệnh nhân thành công",
      patient: newPatient,
    };
  } catch (error) {
    console.error("Error in registerPatient:", error);
    await transaction.rollback();
    console.log("Transaction rolled back due to error");

    if (error instanceof BadRequestError) {
      throw error;
    }

    if (error.name === "SequelizeValidationError") {
      throw new BadRequestError(error.message);
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      throw new BadRequestError("Email hoặc số điện thoại đã được sử dụng");
    }

    throw new Error(`Lỗi trong quá trình đăng ký: ${error.message}`);
  }
};

export const verifyEmail = async (email, otp_code) => {
  try {
    const user = await User.findOne({
      where: { email },
      include: [{ model: Patient, as: "Patient" }],
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const patient = user.Patient;
    if (!patient) throw new NotFoundError("Patient not found");

    if (patient.is_verified)
      throw new BadRequestError("Email already verified");
    if (patient.otp_code !== otp_code)
      throw new BadRequestError("Invalid OTP code");
    if (patient.otp_expiry < new Date())
      throw new BadRequestError("OTP code has expired");

    patient.is_verified = true;
    patient.otp_code = null;
    patient.otp_expiry = null;

    await patient.save();

    return {
      message: "Xác thực email thành công",
    };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      throw error;
    }
    throw new Error("Lỗi trong quá trình xác thực email: " + error.message);
  }
};

export const changePassword = async (user_id, oldPassword, newPassword) => {
  const transaction = await db.sequelize.transaction();
  try {
    const user = await db.User.findByPk(user_id, {
      include: [{ model: db.Patient, as: "Patient" }],
      transaction,
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const patient = user.Patient;
    if (!patient) {
      throw new NotFoundError("Patient not found");
    }

    if (!patient.is_verified) {
      const otp_code = Math.floor(100000 + Math.random() * 900000).toString();
      const otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

      patient.otp_code = otp_code;
      patient.otp_expiry = otp_expiry;

      await patient.save({ transaction });

      const link = `${process.env.URL}/patient/verify?email=${user.email}&otp_code=${otp_code}`;
      await sendVerifyLink(user.email, link); // Gửi email xác thực mới

      await transaction.commit();
      return {
        message: "Email not verified. Verification link has been resent.",
      };
    }

    // So sánh mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestError("Incorrect password");
    }
    user.password = newPassword;
    await user.save({ transaction });

    await transaction.commit();
    return { message: "Success" };
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};

export const loginPatient = async ({ email, password }) => {
  try {
    const user = await db.User.findOne({
      where: { email, role: "patient" },
      include: [{ model: db.Patient, as: "Patient" }],
    });

    if (!user) {
      throw new NotFoundError("Bệnh nhân không tồn tại hoặc email không đúng");
    }

    const patient = user.Patient;
    if (!patient) {
      throw new NotFoundError("Thông tin bệnh nhân không tồn tại");
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError("Mật khẩu không chính xác");
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return {
      message: "Đăng nhập thành công",
      token,
      patient: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        role: user.role,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address,
        phone_number: patient.phone_number,
        insurance_number: patient.insurance_number,
        id_number: patient.id_number,
        is_verified: patient.is_verified,
      },
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
      throw error;
    }
    throw new Error(`Lỗi trong quá trình đăng nhập: ${error.message}`);
  }
};

export const getAllSpecializations = async () => {
  const specializations = await db.Specialization.findAll({
    attributes: ["specialization_id", "name", "image", "fees"],
    order: [["name", "ASC"]],
  });

  if (!specializations || specializations.length === 0) {
    throw new NotFoundError("Không có chuyên khoa nào");
  }

  return {
    success: true,
    message: "Lấy danh sách chuyên khoa thành công",
    data: specializations,
  };
};

export const getAllDoctors = async () => {
  const doctors = await db.Doctor.findAll({
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["username", "email", "avatar"],
      },
      {
        model: db.Specialization,
        as: "Specialization",
        attributes: ["specialization_id", "name", "fees", "image"],
      },
    ],
    attributes: [
      "doctor_id",
      "degree",
      "experience_years",
      "description",
      "rating",
    ],
    order: [["rating", "DESC"]],
  });

  if (!doctors || doctors.length === 0) {
    throw new NotFoundError("Không tìm thấy bác sĩ nào");
  }

  return {
    success: true,
    message: "Lấy danh sách bác sĩ thành công",
    data: doctors,
  };
};

export const getDoctorProfile = async (doctor_id) => {
  const doctor = await db.Doctor.findByPk(doctor_id, {
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["username", "email", "avatar"],
      },
      {
        model: db.Specialization,
        as: "Specialization",
        attributes: ["specialization_id", "name", "fees", "image"],
      },
      {
        model: db.Schedule,
        as: "schedule",
        attributes: {
          exclude: ["doctor_id", "createdAt", "updatedAt"],
        },
      },
    ],
    attributes: [
      "doctor_id",
      "degree",
      "experience_years",
      "description",
      "rating",
    ],
  });

  if (!doctor) {
    throw new NotFoundError("Không tìm thấy bác sĩ");
  }

  return {
    success: true,
    message: "Lấy thông tin bác sĩ thành công",
    data: doctor,
  };
};
export const getPatientProfile = async (user_id) => {
  const patient = await Patient.findOne({
    where: { user_id },
  });
  return patient;
};

export const getFamilyMemberById = async (user_id, family_member_id) => {
  const t = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await Patient.findOne({
      where: { user_id },
      transaction: t,
    });

    if (!patient) {
      throw new BadRequestError("Không tìm thấy thông tin bệnh nhân");
    }

    // Tìm thông tin chi tiết của family member
    const familyMember = await FamilyMember.findOne({
      where: {
        family_member_id,
        patient_id: patient.patient_id,
      },
      transaction: t,
    });

    if (!familyMember) {
      throw new NotFoundError("Không tìm thấy thành viên gia đình");
    }

    // Commit transaction nếu thành công
    await t.commit();

    return familyMember;
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    throw error;
  }
};

export const getAllSymptoms = async () => {
  const t = await db.sequelize.transaction();

  try {
    // Lấy tất cả triệu chứng và sắp xếp theo tên
    const symptoms = await db.Symptom.findAll({
      attributes: ["symptom_id", "name"],
      order: [["name", "ASC"]],
      include: [
        {
          model: db.Specialization,
          as: "specializations",
          attributes: ["specialization_id", "name"],
          through: { attributes: [] }, // Không lấy thông tin từ bảng trung gian
        },
      ],
      transaction: t,
    });

    // Kiểm tra nếu không có triệu chứng nào
    if (!symptoms || symptoms.length === 0) {
      await t.commit();
      return {
        success: true,
        message: "Không có triệu chứng nào trong hệ thống",
        data: [],
      };
    }

    // Format lại dữ liệu trước khi trả về
    const formattedSymptoms = symptoms.map((symptom) => ({
      symptom_id: symptom.symptom_id,
      name: symptom.name,
      specializations: symptom.specializations.map((spec) => ({
        specialization_id: spec.specialization_id,
        name: spec.name,
      })),
    }));

    await t.commit();
    return {
      success: true,
      message: "Lấy danh sách triệu chứng thành công",
      data: formattedSymptoms,
    };
  } catch (error) {
    await t.rollback();
    console.error("Error in getAllSymptoms service:", error);
    throw new InternalServerError(
      "Có lỗi xảy ra khi lấy danh sách triệu chứng"
    );
  }
};

export const getDoctorDayOff = async (doctor_id) => {
  const t = await db.sequelize.transaction();

  try {
    // Kiểm tra bác sĩ có tồn tại không
    const doctor = await db.Doctor.findByPk(doctor_id, {
      transaction: t,
    });

    if (!doctor) {
      throw new NotFoundError("Không tìm thấy bác sĩ");
    }

    // Lấy tất cả ngày nghỉ của bác sĩ
    const dayOffs = await db.DoctorDayOff.findAll({
      where: {
        doctor_id,
        status: "active",
        off_date: {
          [Op.gte]: dayjs().format("YYYY-MM-DD"), // Chỉ lấy ngày nghỉ từ hôm nay trở đi
        },
      },
      order: [["off_date", "ASC"]],
      transaction: t,
    });

    // Format dữ liệu trả về
    const formattedDayOffs = dayOffs.map((dayOff) => ({
      day_off_id: dayOff.day_off_id,
      off_date: dayjs(dayOff.off_date).format("YYYY-MM-DD"),
      off_morning: dayOff.off_morning,
      off_afternoon: dayOff.off_afternoon,
      reason: dayOff.reason,
      status: dayOff.status,
      created_at: dayjs(dayOff.createdAt).format("YYYY-MM-DD HH:mm:ss"),
      updated_at: dayjs(dayOff.updatedAt).format("YYYY-MM-DD HH:mm:ss"),
    }));

    await t.commit();

    return {
      success: true,
      message: "Lấy danh sách ngày nghỉ của bác sĩ thành công",
      data: formattedDayOffs,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const getDoctorBySymptoms = async (
  user_id,
  symptoms,
  appointment_datetime,
  family_member_id = null,
  family_member_data = null
) => {
  const transaction = await db.sequelize.transaction();
  let isCommitted = false;

  try {
    console.log(symptoms);
    console.log(appointment_datetime);
    console.log(family_member_id);
    console.log(family_member_data);
    // Tìm thông tin bệnh nhân
    const patient = await db.Patient.findOne({
      where: { user_id },
      transaction,
    });

    if (!patient) {
      throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
    }

    // Xử lý thông tin người thân nếu có
    let familyMember = null;
    if (family_member_id) {
      familyMember = await handleFamilyMemberData(
        family_member_id,
        patient.patient_id,
        family_member_data,
        transaction
      );
    }

    // Xác thực triệu chứng
    const symptomRecords = await validateSymptoms(symptoms, transaction);

    // Tính tuổi bệnh nhân
    const birthDate = dayjs(
      familyMember ? familyMember.dob : patient.date_of_birth
    );
    const currentDate = dayjs();
    const age = currentDate.diff(birthDate, "year");

    // Phân loại chuyên khoa
    let specialization_id;
    let specialization_name;

    if (age < 13) {
      const pediatrics = await db.Specialization.findOne({
        where: { name: "Nhi" },
        transaction,
      });
      if (!pediatrics) {
        throw new NotFoundError("Không tìm thấy chuyên khoa Nhi khoa");
      }
      specialization_id = pediatrics.specialization_id;
      specialization_name = pediatrics.name;
    } else if (symptoms.length >= 3) {
      const general = await db.Specialization.findOne({
        where: { name: "Tổng hợp" },
        transaction,
      });
      if (!general) {
        throw new NotFoundError("Không tìm thấy chuyên khoa Tổng hợp");
      }
      specialization_id = general.specialization_id;
      specialization_name = general.name;
    } else {
      const mappings = await db.SymptomSpecializationMapping.findAll({
        where: {
          symptom_id: {
            [Op.in]: symptoms,
          },
        },
        include: [
          {
            model: db.Specialization,
            as: "specialization",
            attributes: ["name"],
          },
        ],
        transaction,
      });

      const specializationCount = {};
      const specializationNames = {};

      mappings.forEach((mapping) => {
        specializationCount[mapping.specialization_id] =
          (specializationCount[mapping.specialization_id] || 0) + 1;
        if (mapping.Specialization) {
          specializationNames[mapping.specialization_id] =
            mapping.Specialization.name;
        }
      });

      const sortedSpecializations = Object.entries(specializationCount).sort(
        (a, b) => b[1] - a[1]
      );

      if (sortedSpecializations.length === 0) {
        throw new NotFoundError("Không tìm thấy chuyên khoa phù hợp");
      }

      if (
        sortedSpecializations.length > 1 &&
        sortedSpecializations[0][1] === sortedSpecializations[1][1]
      ) {
        const general = await db.Specialization.findOne({
          where: { name: "Tổng hợp" },
          transaction,
        });
        if (!general) {
          throw new NotFoundError("Không tìm thấy chuyên khoa Tổng hợp");
        }
        specialization_id = general.specialization_id;
        specialization_name = general.name;
      } else {
        specialization_id = sortedSpecializations[0][0];
        specialization_name =
          specializationNames[specialization_id] || "Unknown";
      }
    }

    // Xác thực thời gian đặt lịch
    const apptTime = validateAppointmentTime(appointment_datetime);

    // Tìm bác sĩ phù hợp có lịch trống
    const selectedDoctor = await findAvailableDoctor(
      specialization_id,
      apptTime,
      appointment_datetime,
      transaction
    );

    // Commit transaction
    await transaction.commit();
    isCommitted = true;

    return {
      success: true,
      message: "Tìm bác sĩ phù hợp thành công",
      data: {
        doctor_id: selectedDoctor.doctor_id,
        doctor_name: selectedDoctor.user ? selectedDoctor.user.username : null,
        specialization: selectedDoctor.Specialization
          ? selectedDoctor.Specialization.name
          : null,
        recommended_specialization: specialization_name,
        description: selectedDoctor.description,
        fees: selectedDoctor.Specialization?.fees || 0,
        patient: {
          patient_id: familyMember
            ? familyMember.family_member_id
            : patient.patient_id,
          full_name: familyMember ? familyMember.username : patient.username,
          date_of_birth: familyMember
            ? familyMember.dob
            : patient.date_of_birth,
          gender: familyMember ? familyMember.gender : patient.gender,
          phone_number: familyMember
            ? familyMember.phone_number
            : patient.phone_number,
          relationship: familyMember ? familyMember.relationship : null,
        },
      },
    };
  } catch (error) {
    if (!isCommitted) {
      await transaction.rollback();
    }
    throw error;
  }
};

export const getAllAppointments = async (user_id, family_member_id = null) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await db.Patient.findOne({
      where: { user_id },
      transaction,
    });

    if (!patient) {
      throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
    }

    // Nếu có family_member_id, kiểm tra xem người thân có thuộc về patient này không
    if (family_member_id) {
      const familyMember = await db.FamilyMember.findOne({
        where: {
          family_member_id,
          patient_id: patient.patient_id,
        },
        transaction,
      });

      if (!familyMember) {
        throw new BadRequestError(
          "Người thân không tồn tại hoặc không thuộc về bạn"
        );
      }
    }

    // Lấy tất cả family_member_ids của patient
    const familyMembers = await db.FamilyMember.findAll({
      where: { patient_id: patient.patient_id },
      attributes: ["family_member_id"],
      transaction,
    });

    const familyMemberIds = familyMembers.map(
      (member) => member.family_member_id
    );

    // Lấy danh sách lịch hẹn
    const appointments = await db.Appointment.findAll({
      where: {
        [Op.or]: [
          { family_member_id: family_member_id || null },
          { family_member_id: { [Op.in]: familyMemberIds } },
        ],
      },
      include: [
        {
          model: db.Doctor,
          as: "Doctor",
          attributes: ["doctor_id", "specialization_id"],
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["user_id", "username", "email", "avatar"],
            },
            {
              model: db.Specialization,
              as: "Specialization",
              attributes: ["name", "fees"],
            },
          ],
        },
        {
          model: db.FamilyMember,
          as: "FamilyMember",
          attributes: ["username", "relationship"],
        },
      ],
      order: [["appointment_datetime", "DESC"]],
      transaction,
    });

    // Format dữ liệu trả về
    const formattedAppointments = appointments.map((appointment) => ({
      appointment_id: appointment.appointment_id,
      appointment_datetime: dayjs(appointment.appointment_datetime).format(
        "YYYY-MM-DDTHH:mm:ssZ"
      ),
      status: appointment.status,
      fees: appointment.fees,
      doctor: appointment.Doctor
        ? {
            doctor_id: appointment.Doctor.doctor_id,
            name: appointment.Doctor.user
              ? appointment.Doctor.user.username
              : "Unknown",
            specialization: appointment.Doctor.Specialization
              ? appointment.Doctor.Specialization.name
              : "Unknown",
          }
        : null,
      family_member: appointment.FamilyMember
        ? {
            family_member_id: appointment.FamilyMember.family_member_id,
            name: appointment.FamilyMember.username,
            relationship: appointment.FamilyMember.relationship,
          }
        : null,
    }));

    await transaction.commit();

    return {
      success: true,
      message: "Lấy danh sách lịch hẹn thành công",
      data: formattedAppointments,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const bookAppointment = async (
  user_id,
  doctor_id,
  appointment_datetime,
  family_member_id = null,
  family_member_data = null
) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Tìm thông tin bệnh nhân
    const patient = await db.Patient.findOne({
      where: { user_id },
      transaction,
    });

    if (!patient) {
      throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
    }

    // Xử lý thông tin người thân nếu có
    let familyMember = null;
    if (family_member_id) {
      familyMember = await handleFamilyMemberData(
        family_member_id,
        patient.patient_id,
        family_member_data,
        transaction
      );
    }

    // Kiểm tra bác sĩ tồn tại
    const doctor = await db.Doctor.findByPk(doctor_id, {
      include: [
        {
          model: db.Specialization,
          as: "Specialization",
          attributes: ["name", "fees"],
        },
        { model: db.Schedule, as: "Schedule" },
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
      transaction,
    });

    if (!doctor) {
      throw new NotFoundError("Không tìm thấy bác sĩ");
    }

    // Xác thực thời gian đặt lịch
    const apptTime = validateAppointmentTime(appointment_datetime);

    // Kiểm tra lịch làm việc của bác sĩ
    const weekdayNumber = apptTime.day();
    const weekdayMap = {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday",
      5: "friday",
      6: "saturday",
    };
    const weekday = weekdayMap[weekdayNumber];

    if (doctor.Schedule && doctor.Schedule[weekday] === false) {
      throw new BadRequestError("Bác sĩ không làm việc vào ngày này");
    }

    // Kiểm tra ngày nghỉ cuối tuần
    if (weekdayNumber === 0 || weekdayNumber === 6) {
      throw new BadRequestError("Không thể đặt lịch vào ngày cuối tuần");
    }

    // Kiểm tra thời gian làm việc
    const timeStr = appointment_datetime.split("T")[1];
    const [hours, minutes] = timeStr.split(":").map(Number);

    if (minutes !== 0 && minutes !== 30) {
      throw new BadRequestError("Thời gian đặt lịch phải là các mốc 30 phút");
    }

    const isValidSlot = [
      ...generateMorningSlots(),
      ...generateAfternoonSlots(),
    ].some((slot) => slot.hours === hours && slot.minutes === minutes);

    if (!isValidSlot) {
      throw new BadRequestError(
        "Thời gian không hợp lệ. Các ca sáng: 8:00-11:00, Các ca chiều: 13:30-17:00"
      );
    }

    // Kiểm tra ngày nghỉ của bác sĩ
    const appointmentDate = apptTime.format("YYYY-MM-DD");
    const isMorning = hours < 12;

    const dayOff = await db.DoctorDayOff.findOne({
      where: {
        doctor_id,
        off_date: appointmentDate,
        status: "active",
        [Op.or]: [
          {
            [Op.and]: [{ off_morning: true }, { off_afternoon: true }],
          },
          {
            [Op.and]: [
              { off_morning: true },
              sequelize.where(sequelize.literal("1"), "=", isMorning ? 1 : 0),
            ],
          },
          {
            [Op.and]: [
              { off_afternoon: true },
              sequelize.where(sequelize.literal("1"), "=", isMorning ? 0 : 1),
            ],
          },
        ],
      },
      transaction,
    });

    if (dayOff) {
      throw new BadRequestError("Bác sĩ đã đăng ký nghỉ vào thời gian này");
    }

    // Kiểm tra lịch hẹn trùng lặp
    await checkExistingAppointment(
      appointment_datetime,
      family_member_id,
      transaction
    );

    // Kiểm tra lịch hẹn của bác sĩ
    const existingDoctorAppointment = await db.Appointment.findOne({
      where: {
        doctor_id,
        appointment_datetime,
        status: {
          [Op.in]: ["accepted", "waiting_for_confirmation", "doctor_day_off"],
        },
      },
      transaction,
    });

    if (existingDoctorAppointment) {
      throw new BadRequestError("Bác sĩ đã có lịch hẹn vào thời gian này");
    }

    // Tạo lịch hẹn mới
    const appointment = await db.Appointment.create(
      {
        doctor_id,
        family_member_id: family_member_id || null,
        appointment_datetime,
        status: "waiting_for_confirmation",
        fees: doctor.Specialization?.fees || 0,
      },
      { transaction }
    );

    await transaction.commit();

    return {
      success: true,
      message: "Đặt lịch hẹn thành công",
      data: {
        appointment_id: appointment.appointment_id,
        doctor_name: doctor.user ? doctor.user.username : null,
        specialization: doctor.Specialization
          ? doctor.Specialization.name
          : null,
        appointment_datetime: apptTime.format("YYYY-MM-DDTHH:mm:ssZ"),
        status: appointment.status,
        fees: doctor.Specialization?.fees || 0,
        family_member_id: appointment.family_member_id,
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Các hàm hỗ trợ
const validateSymptoms = async (symptoms, transaction) => {
  const symptomRecords = await db.Symptom.findAll({
    where: {
      symptom_id: {
        [Op.in]: symptoms,
      },
    },
    transaction,
  });

  if (symptomRecords.length !== symptoms.length) {
    throw new BadRequestError(
      "Một số triệu chứng không tồn tại trong hệ thống"
    );
  }

  return symptomRecords;
};

const validateAppointmentTime = (appointment_datetime) => {
  const apptTime = dayjs(appointment_datetime).tz("Asia/Ho_Chi_Minh");

  if (!apptTime.isValid()) {
    throw new BadRequestError("Thời gian không hợp lệ");
  }

  const now = dayjs().tz("Asia/Ho_Chi_Minh");

  if (apptTime.isBefore(now)) {
    throw new BadRequestError("Không thể đặt lịch trong quá khứ");
  }

  if (apptTime.diff(now, "hour") < 2) {
    throw new BadRequestError("Bạn phải đặt lịch trước ít nhất 2 tiếng");
  }

  return apptTime;
};

const findAvailableDoctor = async (
  specialization_id,
  apptTime,
  appointment_datetime,
  transaction
) => {
  const doctors = await db.Doctor.findAll({
    where: { specialization_id },
    include: [
      {
        model: db.Specialization,
        as: "Specialization",
        attributes: ["name", "fees"],
      },
      { model: db.Schedule, as: "Schedule" },
      {
        model: db.User,
        as: "user",
        attributes: ["username"],
      },
    ],
    transaction,
  });

  if (doctors.length === 0) {
    throw new NotFoundError("Không tìm thấy bác sĩ phù hợp");
  }

  const appointmentDate = apptTime.format("YYYY-MM-DD");
  const timeStr = appointment_datetime.split("T")[1];
  const [hours, minutes] = timeStr.split(":").map(Number);
  const isMorning = hours < 12;
  const weekdayNumber = apptTime.day();
  const weekdayMap = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  const weekday = weekdayMap[weekdayNumber];

  const availableDoctors = [];

  for (const doctor of doctors) {
    if (doctor.Schedule && doctor.Schedule[weekday] === false) {
      continue;
    }

    const dayOff = await db.DoctorDayOff.findOne({
      where: {
        doctor_id: doctor.doctor_id,
        off_date: appointmentDate,
        status: "active",
        [Op.or]: [
          {
            [Op.and]: [{ off_morning: true }, { off_afternoon: true }],
          },
          {
            [Op.and]: [
              { off_morning: true },
              sequelize.where(sequelize.literal("1"), "=", isMorning ? 1 : 0),
            ],
          },
          {
            [Op.and]: [
              { off_afternoon: true },
              sequelize.where(sequelize.literal("1"), "=", isMorning ? 0 : 1),
            ],
          },
        ],
      },
      transaction,
    });

    if (dayOff) {
      continue;
    }

    const existingAppointment = await db.Appointment.findOne({
      where: {
        doctor_id: doctor.doctor_id,
        appointment_datetime,
        status: {
          [Op.in]: ["accepted", "waiting_for_confirmation", "doctor_day_off"],
        },
      },
      transaction,
    });

    if (!existingAppointment) {
      const currentWorkload = await db.Appointment.count({
        where: {
          doctor_id: doctor.doctor_id,
          appointment_datetime: {
            [Op.gte]: dayjs().format("YYYY-MM-DD"),
          },
          status: {
            [Op.in]: ["accepted", "waiting_for_confirmation"],
          },
        },
        transaction,
      });

      availableDoctors.push({
        doctor,
        workload: currentWorkload,
      });
    }
  }

  if (availableDoctors.length === 0) {
    throw new BadRequestError(
      "Không tìm thấy bác sĩ có lịch trống vào thời gian này"
    );
  }

  availableDoctors.sort((a, b) => a.workload - b.workload);
  return availableDoctors[0].doctor;
};

const handleFamilyMemberData = async (
  family_member_id,
  patient_id,
  family_member_data,
  transaction
) => {
  const familyMember = await db.FamilyMember.findOne({
    where: {
      family_member_id,
      patient_id,
    },
    transaction,
  });

  if (!familyMember) {
    throw new BadRequestError(
      "Người thân không tồn tại hoặc không thuộc về bạn"
    );
  }

  if (familyMember.date_of_birth) {
    familyMember.dob = familyMember.date_of_birth;
  }

  if (family_member_data) {
    if (family_member_data.username)
      familyMember.username = family_member_data.username;
    if (family_member_data.dob) {
      familyMember.dob = family_member_data.dob;
      familyMember.date_of_birth = family_member_data.dob;
    }
    if (family_member_data.phone_number)
      familyMember.phone_number = family_member_data.phone_number;
    if (family_member_data.gender)
      familyMember.gender = family_member_data.gender;

    await familyMember.save({ transaction });
  }

  return familyMember;
};

const checkExistingAppointment = async (
  appointment_datetime,
  family_member_id,
  transaction
) => {
  const existingPatientAppointment = await db.Appointment.findOne({
    where: {
      appointment_datetime,
      status: {
        [Op.in]: ["accepted", "waiting_for_confirmation"],
      },
      family_member_id: family_member_id || null,
    },
    transaction,
  });

  if (existingPatientAppointment) {
    throw new BadRequestError("Bạn đã có lịch hẹn khác vào thời gian này");
  }
};

const generateMorningSlots = () => {
  const slots = [];
  for (let h = 8; h <= 11; h++) {
    for (let m of [0, 30]) {
      if (h === 11 && m === 30) continue;
      slots.push({ hours: h, minutes: m });
    }
  }
  return slots;
};

const generateAfternoonSlots = () => {
  const slots = [];
  for (let h = 13; h <= 17; h++) {
    for (let m of [0, 30]) {
      if ((h === 13 && m === 0) || (h === 17 && m === 30)) continue;
      slots.push({ hours: h, minutes: m });
    }
  }
  return slots;
};
export const addFamilyMember = async (
  user_id,
  { username, phone_number, email, gender, date_of_birth, relationship }
) => {
  // Bắt đầu một transaction mới
  const t = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await Patient.findOne({
      where: { user_id },
      transaction: t,
    });

    if (!patient) {
      throw new BadRequestError("Không tìm thấy thông tin bệnh nhân");
    }

    // Thêm thành viên gia đình
    const familyMember = await FamilyMember.create(
      {
        patient_id: patient.patient_id,
        username: username,
        phone_number,
        email,
        gender,
        date_of_birth,
        relationship,
      },
      { transaction: t }
    );

    // Commit transaction nếu thành công
    await t.commit();

    return familyMember;
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    throw error;
  }
};
export const deleteFamilyMember = async (user_id, family_member_id) => {
  const t = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await Patient.findOne({
      where: { user_id },
      transaction: t,
    });

    if (!patient) {
      throw new BadRequestError("Không tìm thấy thông tin bệnh nhân");
    }

    // Kiểm tra xem FamilyMember có tồn tại và thuộc về patient này không
    const familyMember = await FamilyMember.findOne({
      where: {
        family_member_id,
        patient_id: patient.patient_id,
      },
      transaction: t,
    });

    if (!familyMember) {
      throw new NotFoundError("Không tìm thấy thành viên gia đình");
    }

    await familyMember.destroy({ transaction: t });

    // Commit transaction nếu thành công
    await t.commit();

    return { message: "Xóa thành viên gia đình thành công" };
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    throw error;
  }
};
export const getFamilyMembers = async (user_id) => {
  // Bắt đầu một transaction mới
  const t = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await Patient.findOne({
      where: { user_id },
      transaction: t,
    });

    if (!patient) {
      throw new BadRequestError("Không tìm thấy thông tin bệnh nhân");
    }

    // Lấy danh sách người thân
    const familyMembers = await FamilyMember.findAll({
      where: { patient_id: patient.patient_id },
      transaction: t,
    });

    // Commit transaction nếu thành công
    await t.commit();

    return familyMembers;
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    throw error;
  }
};
export const updateFamilyMember = async (
  user_id,
  family_member_id,
  updates
) => {
  const t = await db.sequelize.transaction();

  try {
    // Lấy patient_id từ user_id
    const patient = await Patient.findOne({
      where: { user_id },
      transaction: t,
    });

    if (!patient) {
      throw new BadRequestError("Không tìm thấy thông tin bệnh nhân");
    }

    // Kiểm tra xem FamilyMember có tồn tại và thuộc về patient này không
    const familyMember = await FamilyMember.findOne({
      where: {
        family_member_id,
        patient_id: patient.patient_id,
      },
      transaction: t,
    });

    if (!familyMember) {
      throw new NotFoundError("Không tìm thấy thành viên gia đình");
    }

    // Cập nhật thông tin thành viên gia đình
    await familyMember.update(updates, { transaction: t });

    // Commit transaction nếu thành công
    await t.commit();

    return familyMember;
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    throw error;
  }
};

export const cancelAppointment = async (user_id, appointment_id, reason) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Lấy thông tin bệnh nhân
    const patient = await db.Patient.findOne({
      where: { user_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username", "email"],
        },
      ],
      transaction,
    });

    if (!patient) {
      throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
    }

    // Lấy thông tin cuộc hẹn
    const appointment = await db.Appointment.findOne({
      where: {
        appointment_id,
        family_member_id: {
          [db.Sequelize.Op.in]: [
            // Lấy tất cả family_member_id thuộc về patient này
            ...(await db.FamilyMember.findAll({
              where: { patient_id: patient.patient_id },
              attributes: ["family_member_id"],
              transaction,
            }).then((members) => members.map((m) => m.family_member_id))),
          ],
        },
      },
      include: [
        {
          model: db.Doctor,
          as: "Doctor",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["username", "email"],
            },
          ],
        },
        {
          model: db.FamilyMember,
          as: "FamilyMember",
        },
      ],
      transaction,
    });

    if (!appointment) {
      throw new NotFoundError(
        "Không tìm thấy lịch hẹn hoặc lịch hẹn không thuộc về bạn"
      );
    }

    // Kiểm tra trạng thái cuộc hẹn có thể hủy hay không
    const invalidStatuses = [
      "cancelled",
      "completed",
      "doctor_day_off",
      "patient_not_coming",
    ];
    if (invalidStatuses.includes(appointment.status)) {
      throw new BadRequestError(
        `Không thể hủy lịch hẹn đã ${
          appointment.status === "cancelled"
            ? "bị hủy"
            : appointment.status === "completed"
            ? "hoàn thành"
            : appointment.status === "doctor_day_off"
            ? "bị nghỉ"
            : "được đánh dấu bệnh nhân không đến"
        }`
      );
    }

    // Kiểm tra thời gian hủy
    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    const appointmentTime = dayjs(appointment.appointment_datetime).tz(
      "Asia/Ho_Chi_Minh"
    );
    const timeDiff = appointmentTime.diff(now, "hour");

    if (timeDiff < 24) {
      throw new BadRequestError(
        "Không thể hủy lịch hẹn trước thời điểm diễn ra ít hơn 24 giờ"
      );
    }

    // Cập nhật trạng thái cuộc hẹn
    appointment.status = "cancelled";
    appointment.cancelled_at = now.toDate();
    appointment.cancelled_by = "Bệnh nhân";
    appointment.cancel_reason = reason;
    await appointment.save({ transaction });

    // TODO: Gửi email thông báo cho bác sĩ về việc hủy lịch

    await transaction.commit();

    return {
      success: true,
      message: "Hủy lịch hẹn thành công",
      data: {
        appointment_id: appointment.appointment_id,
        status: appointment.status,
        appointment_datetime: appointmentTime.format("YYYY-MM-DDTHH:mm:ss"),
        patient: {
          name: patient.user.username,
          email: patient.user.email,
        },
        doctor: {
          name: appointment.Doctor.user.username,
          email: appointment.Doctor.user.email,
        },
        cancelled_at: now.format("YYYY-MM-DDTHH:mm:ss"),
        cancelled_by: "Patient - bệnh nhân",
        cancel_reason: reason,
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const getAppointmentById = async (appointmentId, userId) => {
  try {
    // 1. Lấy patient_id của user đang login
    const patientRecord = await db.Patient.findOne({
      where: { user_id: userId },
      attributes: ["patient_id"],
      include: [
        {
          model: db.FamilyMember,
          as: "familyMembers",
          attributes: ["family_member_id"],
        },
      ],
    });

    if (!patientRecord) {
      throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
    }

    // 2. Build danh sách family_member_id
    const familyIds = (patientRecord.familyMembers || []).map(
      (fm) => fm.family_member_id
    );

    // 3. Tìm appointment chỉ dựa trên family_member_id và appointment_id
    const appointment = await db.Appointment.findOne({
      where: {
        appointment_id: appointmentId,
        family_member_id: { [Op.in]: familyIds },
      },
      attributes: [
        "appointment_id",
        "family_member_id",
        "doctor_id",
        "appointment_datetime",
        "status",
        "fees",
        "cancelled_at",
        "cancelled_by",
        "cancel_reason",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: db.Doctor,
          as: "Doctor",
          attributes: ["doctor_id", "specialization_id"],
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["user_id", "username", "email", "avatar"],
            },
            {
              model: db.Specialization,
              as: "Specialization",
              attributes: ["name", "fees"],
            },
          ],
        },
        {
          model: db.MedicalRecord,
          as: "MedicalRecord",
        },
        {
          model: db.Prescription,
          as: "Prescription",
          include: [
            {
              model: db.PrescriptionMedicine,
              as: "prescriptionMedicines",
              include: [
                {
                  model: db.Medicine,
                  as: "Medicine",
                  attributes: ["name", "unit", "price"],
                },
              ],
            },
          ],
        },
        {
          model: db.Payment,
          as: "Payments",
          attributes: [
            "payment_id",
            "amount",
            "payment_method",
            "status",
            "createdAt",
          ],
        },
        {
          model: db.FamilyMember,
          as: "FamilyMember",
          attributes: [
            "family_member_id",
            "username",
            "date_of_birth",
            "phone_number",
            "gender",
            "relationship",
          ],
          include: [
            {
              model: db.Patient,
              as: "patient",
              attributes: ["patient_id"],
              where: { patient_id: patientRecord.patient_id },
            },
          ],
        },
      ],
    });

    if (!appointment) {
      throw new NotFoundError("Không tìm thấy thông tin lịch hẹn");
    }

    return {
      success: true,
      message: "Lấy thông tin lịch hẹn thành công",
      data: appointment,
    };
  } catch (error) {
    console.error("Error in getAppointmentById service:", error);
    throw error;
  }
};
export const createMomoPayment = async (req, res) => {
  try {
    const { appointment_id, amount } = req.body;
    if (!appointment_id || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu appointment_id hoặc amount" });
    }

    // Lấy payment pending đã tạo khi bác sĩ completeAppointment
    const pending = await paymentService.getPendingPaymentByAppointment(
      appointment_id
    );
    if (!pending.success) {
      return res.status(404).json({ success: false, message: pending.message });
    }

    const orderId = `${appointment_id}_${Date.now()}`;
    const requestId = orderId;
    const extraData = String(appointment_id);
    const orderInfo = `Thanh toán lịch hẹn #${appointment_id}`;
    const requestType = "payWithMethod";
    const ipnUrl = `${BACKEND_URL}/patient/appointments/${appointment_id}/payment/callback`;
    const redirectUrl = `${FRONTEND_URL}/patient/appointments/${appointment_id}/payment`;

    // Tạo chữ ký
    const rawSignature = [
      `accessKey=${MOMO_ACCESS_KEY}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${MOMO_PARTNER_CODE}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join("&");

    const signature = crypto
      .createHmac("sha256", MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    // Gọi MoMo create
    const momoReq = {
      partnerCode: MOMO_PARTNER_CODE,
      partnerName: "Test",
      storeId: "MomoTestStore",
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: "vi",
      requestType,
      autoCapture: true,
      extraData,
      orderGroupId: "",
      signature,
    };

    const momoRes = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      momoReq,
      { headers: { "Content-Type": "application/json" } }
    );

    return res.status(200).json(momoRes.data);
  } catch (err) {
    console.error("createMomoPayment error:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo thanh toán",
      error: err.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const { order_id, transaction_id } = req.body;

    // Đánh dấu paid
    await paymentService.markPaymentPaid({
      appointment_id,
      order_id,
      transaction_id,
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thanh toán thành công",
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    if (err instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xác thực thanh toán",
      error: err.message,
    });
  }
};

export const handleCallback = async (req, res) => {
  try {
    const { resultCode, orderId, transId, extraData } = req.body;
    console.log("MoMo IPN callback:", req.body);

    if (resultCode === 0) {
      const appointment_id = parseInt(extraData, 10);
      await paymentService.markPaymentPaid({
        appointment_id,
        order_id: orderId,
        transaction_id: transId,
      });
      console.log(`✅ Payment success for appointment ${appointment_id}`);
    } else {
      console.log(`❌ Payment failed, resultCode=${resultCode}`);
    }

    // luôn trả 200 để MoMo không retry
    return res.status(200).json({ message: "Processed" });
  } catch (err) {
    console.error("handleCallback error:", err);
    return res.status(200).json({ message: "Processed with error" });
  }
};
