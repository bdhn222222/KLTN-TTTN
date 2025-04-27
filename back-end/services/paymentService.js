import db from "../models/index.js";
import BadRequestError from "../errors/bad_request.js";
import NotFoundError from "../errors/not_found.js";
import crypto from "crypto";
import axios from "axios";
import { Op } from "sequelize";

const {
  MOMO_PARTNER_CODE,
  MOMO_ACCESS_KEY,
  MOMO_SECRET_KEY,
  FRONTEND_URL,
  APP_DOMAIN,
  BACKEND_URL,
} = process.env;

const MOMO_ENDPOINT = "https://test-payment.momo.vn";

export async function createMomoPayment(appointment_id) {
  // 1. Kiểm tra appointment đã hoàn thành chưa, lấy amount
  const appt = await db.Appointment.findOne({
    where: { appointment_id, status: "completed" },
    include: [
      {
        model: db.Doctor,
        as: "Doctor",
        include: [
          {
            model: db.Specialization,
            as: "Specialization",
            attributes: ["fees"],
          },
        ],
      },
    ],
  });
  if (!appt)
    throw new NotFoundError("Lịch hẹn không tồn tại hoặc chưa hoàn thành");
  const amount = appt.fees;
  if (!amount) throw new BadRequestError("Phí khám bệnh không hợp lệ");

  // 2. Đảm bảo chưa có payment paid
  if (await db.Payment.findOne({ where: { appointment_id, status: "paid" } }))
    throw new BadRequestError("Đã thanh toán trước đó");

  // 3. Tạo orderId + extraData
  const orderId = `${appointment_id}_${Date.now()}`;
  const requestId = orderId;
  const orderInfo = `Thanh toán lịch hẹn #${appointment_id}`;
  const extraData = Buffer.from(JSON.stringify({ appointment_id })).toString(
    "base64"
  );
  const redirectUrl = `${FRONTEND_URL}/patient/appointment/${appointment_id}`;
  const ipnUrl = `${APP_DOMAIN}/patient/appointments/${appointment_id}/payment/callback`;
  console.log("=============================");
  console.log("MoMo Callback URL:", ipnUrl);
  console.log("BACKEND_URL value:", BACKEND_URL);
  console.log("=============================");
  const requestType = "captureWallet";

  // 4. Ký HMAC SHA256
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

  // 5. Tạo/ cập nhật bản ghi Payment pending
  // await db.Payment.upsert(
  //   {
  //     appointment_id,
  //     amount,
  //     payment_method: "MoMo",
  //     status: "pending",
  //     order_id: orderId,
  //   },
  //   { returning: true }
  // );

  // 6. Gửi request tới MoMo
  const resp = await axios.post(
    `${MOMO_ENDPOINT}/v2/gateway/api/create`,
    {
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
    },
    { headers: { "Content-Type": "application/json" } }
  );

  if (resp.data.resultCode !== 0)
    throw new Error(`MoMo error: ${resp.data.message}`);

  return { payUrl: resp.data.payUrl, orderId, amount };
}

export async function verifyMomoPayment(appointment_id, momoPayload) {
  console.log("📥 Xử lý dữ liệu thanh toán MoMo:", {
    appointment_id,
    orderId: momoPayload.orderId,
    resultCode: momoPayload.resultCode,
    transId: momoPayload.transId,
    message: momoPayload.message,
  });

  const {
    partnerCode,
    orderId,
    requestId,
    amount,
    resultCode,
    message,
    transId,
    extraData,
  } = momoPayload;

  try {
    // Lấy appointment_id từ orderId
    const paymentIdParts = orderId.split("_");
    const paymentAppointmentId = parseInt(paymentIdParts[0]);

    // Verify appointment_id trong URL và trong orderId phải khớp nhau
    if (paymentAppointmentId !== parseInt(appointment_id)) {
      console.error("❌ Mã lịch hẹn không khớp:", {
        urlAppointmentId: appointment_id,
        orderAppointmentId: paymentAppointmentId,
      });
      throw new BadRequestError("Mã lịch hẹn không khớp với mã đơn hàng");
    }

    // Tìm payment pending của appointment này
    const payment = await db.Payment.findOne({
      where: {
        appointment_id,
        status: {
          [Op.or]: ["pending", "cancelled"],
        },
      },
      // order: [["createdAt", "DESC"]], // Lấy payment pending mới nhất
    });

    if (!payment) {
      console.error("❌ Không tìm thấy payment pending hoặc cancelled:", {
        appointment_id,
      });
      throw new NotFoundError("Không tìm thấy thanh toán đang chờ hoặc đã hủy");
    }

    console.log(`📋 Tìm thấy payment pending: #${payment.payment_id}`);

    // Verify số tiền nếu có
    if (amount && parseInt(amount) !== payment.amount) {
      console.error("❌ Số tiền không khớp:", {
        expected: payment.amount,
        received: parseInt(amount),
      });
      throw new BadRequestError("Số tiền thanh toán không khớp");
    }

    const transaction = await db.sequelize.transaction();

    try {
      // Xử lý theo kết quả thanh toán
      if (resultCode === 0 || resultCode === "0") {
        console.log(
          `✅ Thanh toán thành công, cập nhật payment #${payment.payment_id}`
        );

        // Cập nhật payment
        await payment.update(
          {
            status: "paid",
            payment_method: "MoMo",
            // transaction_id: transId,
            // paid_at: new Date(),
          },
          { transaction }
        );

        // Cập nhật appointment
        // await db.Appointment.update(
        //   { payment_status: "paid" },
        //   {
        //     where: { appointment_id },
        //     transaction,
        //   }
        // );

        await transaction.commit();
        console.log(
          `✨ Payment #${payment.payment_id} đã được đánh dấu là thanh toán thành công`
        );

        return {
          success: true,
          message: "Thanh toán thành công",
          data: {
            orderId,
            transId,
            amount: payment.amount,
          },
        };
      } else {
        console.log(`⚠️ Thanh toán thất bại: ${message}`);

        // Cập nhật payment thành cancelled
        await payment.update(
          {
            status: "cancelled",
            // error_message: message,
          },
          { transaction }
        );

        await transaction.commit();
        console.log(
          `❌ Payment #${payment.payment_id} đã được đánh dấu là thất bại`
        );

        return {
          success: false,
          message: "Thanh toán không thành công",
          error: message,
        };
      }
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Lỗi khi cập nhật trạng thái thanh toán:", error);
      throw error;
    }
  } catch (error) {
    console.error("❌ Lỗi xử lý callback MoMo:", error);
    throw error;
  }
}

export async function getAppointmentWithPayment(appointment_id) {
  try {
    const appointment = await db.Appointment.findOne({
      where: { appointment_id },
      include: [
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
          order: [["createdAt", "DESC"]],
          limit: 1,
        },
      ],
    });

    return appointment;
  } catch (error) {
    console.error("Error getting appointment with payment:", error);
    throw error;
  }
}
