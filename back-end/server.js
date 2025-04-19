import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";
import userRoutes from "./routes/userRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import pharmacistRoutes from "./routes/pharmacistRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import requestLogger from "./middleware/logger.js";
import errorHandler from "./middleware/errorHandler.js";
dotenv.config();

const app = express();

// Middleware để log tất cả requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  next();
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Booking Doctor API" });
});

app.use("/user", userRoutes);
app.use("/doctor", doctorRoutes);
app.use("/admin", adminRoutes);
app.use("/pharmacist", pharmacistRoutes);
app.use("/patient", patientRoutes);

app.use(express.urlencoded({ extended: true }));
var accessKey = "F8BBA842ECF85";
var secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

const PARTNER_CODE = process.env.MOMO_PARTNER_CODE;
const ACCESS_KEY = process.env.MOMO_ACCESS_KEY;
const SECRET_KEY = process.env.MOMO_SECRET_KEY;
const DOMAIN = process.env.APP_DOMAIN;

app.post("/payment", async (req, res) => {
  try {
    const { appointment_id, amount } = req.body;
    if (!appointment_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin appointment_id hoặc amount",
      });
    }

    const partnerCode = PARTNER_CODE;
    const orderInfo = `Thanh toán lịch hẹn #${appointment_id}`;
    const requestType = "payWithMethod";
    // Đảm bảo orderId vừa chứa appointment_id vừa duy nhất
    const orderId = `${appointment_id}_${Date.now()}`;
    const requestId = orderId;
    const extraData = appointment_id.toString();

    const ipnUrl = `${DOMAIN}/callback`;
    const redirectUrl = `${DOMAIN}/patient/appointments/${appointment_id}/payment`;

    // Chuẩn bị chuỗi ký HMAC SHA256
    const rawSignature =
      `accessKey=${ACCESS_KEY}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    const momoBody = {
      partnerCode,
      partnerName: "Test",
      storeId: "MomoTestStore",
      requestId,
      amount,
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
      momoBody,
      { headers: { "Content-Type": "application/json" } }
    );

    return res.status(200).json(momoRes.data);
  } catch (err) {
    console.error("❌ Lỗi gọi API MoMo:", err.message);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi gọi MoMo",
      error: err.message,
    });
  }
});

// Nhận IPN callback từ MoMo
app.post("/callback", async (req, res) => {
  try {
    console.log("📥 [MoMo IPN] Body:", req.body);
    const {
      resultCode,
      orderId,
      transId,
      extraData, // chứa appointment_id
    } = req.body;

    // MoMo trả resultCode===0 nghĩa thành công
    if (resultCode === 0) {
      const appointment_id = parseInt(extraData, 10);
      // Gọi API nội bộ để cập nhật Payment và cho phép Patient xem kết quả
      const token = req.headers.authorization?.split(" ")[1] || "";
      await axios.post(
        `${process.env.BASE_URL}/patient/appointments/${appointment_id}/payment/verify`,
        {
          order_id: orderId,
          transaction_id: transId,
          amount: req.body.amount,
          payment_method: "MoMo",
          status: "paid",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(
        `✅ Payment #${orderId} for appointment ${appointment_id} marked as paid`
      );
    } else {
      console.log(`⚠️ MoMo trả resultCode=${resultCode} (không thành công)`);
    }
    // Luôn 200 để MoMo thôi gửi lại
    res.status(200).json({ message: "Processed" });
  } catch (err) {
    console.error("❌ Lỗi xử lý MoMo callback:", err.message);
    res.status(200).json({ message: "Processed with error" });
  }
});

// Query transaction status
app.post("/transaction-status", async (req, res) => {
  try {
    const { orderId } = req.body;
    const rawSig = `accessKey=${ACCESS_KEY}&orderId=${orderId}&partnerCode=${PARTNER_CODE}&requestId=${orderId}`;
    const signature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(rawSig)
      .digest("hex");
    const body = {
      partnerCode: PARTNER_CODE,
      requestId: orderId,
      orderId,
      signature,
      lang: "vi",
    };
    const momoRes = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/query",
      body,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.status(200).json(momoRes.data);
  } catch (err) {
    console.error("❌ Lỗi query trạng thái giao dịch:", err.message);
    return res.status(500).json({ message: "Lỗi khi truy vấn trạng thái" });
  }
});

// Logger & error handler
app.use(requestLogger);
app.use(errorHandler);
app.use(requestLogger);
app.use(errorHandler);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
