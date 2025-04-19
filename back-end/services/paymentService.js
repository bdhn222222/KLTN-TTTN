import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import NotFoundError from "../errors/not_found.js";
import dayjs from "dayjs";
import { Op } from "sequelize";
import sequelize from "sequelize";
import utc from "dayjs/plugin/utc.js"; // Sử dụng phần mở rộng .js
import timezone from "dayjs/plugin/timezone.js";

// Kích hoạt các plugin
dayjs.extend(utc);
dayjs.extend(timezone);

// Ví dụ về sử dụng
const apptTime = dayjs("2025-04-29T16:00:00").tz("Asia/Ho_Chi_Minh", true);
console.log(apptTime.format()); // In ra thời gian đã chuyển đổi

const { User, Patient, MedicalRecord, Doctor, Payment, FamilyMember } = db;
export const markPaymentPaid = async ({
  appointment_id,
  order_id,
  transaction_id,
}) => {
  // Tìm Payment pending gần nhất cho appointment
  const payment = await db.Payment.findOne({
    where: { appointment_id, status: "pending" },
    order: [["payment_id", "DESC"]],
  });
  if (!payment) throw new NotFoundError("Không tìm thấy thanh toán pending");

  // Cập nhật lên paid
  payment.status = "paid";
  // nếu bạn thêm cột order_id, transaction_id thì lưu luôn ở đây
  payment.order_id = order_id; // (mở rộng DB nếu cần)
  payment.transaction_id = transaction_id; // (mở rộng DB nếu cần)
  await payment.save();

  // Cho phép patient xem kết quả (nếu bạn có flag nào đó, hoặc chuyển appointment sang completed)
  await db.Appointment.update(
    { status: "completed" },
    { where: { appointment_id } }
  );

  return { success: true, data: payment };
};

export const getPendingPaymentByAppointment = async (appointment_id) => {
  const payment = await db.Payment.findOne({
    where: { appointment_id, status: "pending" },
    order: [["payment_id", "DESC"]],
  });
  if (!payment)
    return { success: false, message: "Không tìm thấy thanh toán pending" };
  return { success: true, data: payment };
};
