import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
app.post("/payment", async (req, res) => {
  const partnerCode = "MOMO";
  const orderInfo = "Thanh toán dịch vụ";
  const requestType = "payWithMethod";
  const amount = "50000";
  const orderId = partnerCode + new Date().getTime(); // appointment_id
  const requestId = orderId;
  const extraData = "";
  const orderGroupId = "";
  const autoCapture = true;
  const lang = "vi";

  // ✅ Cập nhật lại IPN & REDIRECT URL đúng ngrok + frontend của bạn
  const domain =
    "https://034a-2405-4802-6f40-d40-1dad-6063-93db-53f6.ngrok-free.app"; // Ngrok hiện tại của bạn
  const ipnUrl = `${domain}/callback`; // MoMo gọi về backend của bạn
  const redirectUrl = `${domain}/payment/success`; // Sau khi thanh toán, trả về frontend

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

  const requestBody = {
    partnerCode,
    partnerName: "Test",
    storeId: "MomoTestStore",
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang,
    requestType,
    autoCapture,
    extraData,
    orderGroupId,
    signature,
  };

  try {
    const result = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json(result.data);
  } catch (error) {
    console.error("Lỗi gọi API MoMo:", error.message);
    return res.status(500).json({ message: "Lỗi khi gọi MoMo" });
  }
});

// ✅ Nhận callback IPN từ MoMo
app.post("/callback", (req, res) => {
  console.log("📥 [MoMo] IPN CALLBACK RECEIVED");
  console.log("➡ Headers:", req.headers);
  console.log("➡ Body:", req.body);
  res.status(200).send("Callback received");
});

app.post("/transaction-status", async (req, res) => {
  const { orderId } = req.body;

  const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex"); // ✅ Sửa tại đây

  const requestBody = {
    partnerCode: "MOMO",
    requestId: orderId,
    orderId,
    signature,
    lang: "vi",
  };

  try {
    const result = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/query",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json(result.data);
  } catch (error) {
    console.error("Lỗi truy vấn trạng thái giao dịch:", error.message);
    return res.status(500).json({ message: "Lỗi khi truy vấn trạng thái" });
  }
});

app.use(requestLogger);
app.use(errorHandler);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
