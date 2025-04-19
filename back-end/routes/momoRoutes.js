import express from "express";
import * as paymentService from "../services/paymentService.js";

const router = express.Router();

router.post("/callback", async (req, res) => {
  try {
    console.log("📥 [MoMo IPN] Body:", req.body);
    const {
      resultCode,
      orderId,
      transId,
      extraData, // chứa appointment_id
      amount,
    } = req.body;

    // Decode extraData để lấy appointment_id
    const decodedData = JSON.parse(Buffer.from(extraData, "base64").toString());
    const appointment_id = decodedData.appointment_id;

    // MoMo trả resultCode===0 nghĩa thành công
    if (resultCode === 0) {
      await paymentService.verifyMomoPayment(appointment_id, {
        resultCode,
        orderId,
        transId,
        amount,
        message: req.body.message,
      });
      console.log(
        `✅ Payment #${orderId} for appointment ${appointment_id} marked as paid`
      );
    } else {
      console.log(`⚠️ MoMo trả resultCode=${resultCode} (không thành công)`);
      // Vẫn gọi verify để cập nhật trạng thái failed
      await paymentService.verifyMomoPayment(appointment_id, req.body);
    }

    // Luôn trả về 200 để MoMo không gửi lại
    res.status(200).json({ message: "Processed" });
  } catch (err) {
    console.error("❌ Lỗi xử lý MoMo callback:", err);
    // Vẫn trả về 200 để MoMo không gửi lại
    res.status(200).json({ message: "Processed with error" });
  }
});

export default router;
