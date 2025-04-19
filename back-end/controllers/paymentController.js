import * as paymentService from "../services/paymentService.js";

export const createMomoPayment = async (req, res) => {
  try {
    const { appointment_id } = req.params;

    const result = await paymentService.createMomoPayment(appointment_id);

    return res.status(200).json({
      success: true,
      message: "Tạo thanh toán thành công",
      data: result,
    });
  } catch (error) {
    console.error("Error creating MoMo payment:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};

export const handleMomoCallback = async (req, res) => {
  try {
    console.log("\n=== MOMO CALLBACK DATA ===");
    console.log("Headers:", req.headers);
    console.log("\nBody:", JSON.stringify(req.body, null, 2));
    console.log("\nParams:", req.params);
    console.log("========================\n");

    const { appointment_id } = req.params;
    const result = await paymentService.verifyMomoPayment(
      appointment_id,
      req.body
    );

    // MoMo luôn cần nhận được status 200, bất kể kết quả thành công hay thất bại
    return res.status(200).json({ message: "Processed" });
  } catch (error) {
    console.error("Error processing MoMo callback:", error);

    // Vẫn trả về 200 để MoMo không gửi lại
    return res.status(200).json({ message: "Processed with error" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const { orderId } = req.query;

    // Kiểm tra trạng thái payment
    const appointment = await paymentService.getAppointmentWithPayment(
      appointment_id
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    // Kiểm tra xem payment đã được xử lý chưa
    if (appointment.Payments && appointment.Payments.length > 0) {
      const lastPayment = appointment.Payments[0]; // Mới nhất

      if (lastPayment.status === "paid") {
        return res.status(200).json({
          success: true,
          message: "Thanh toán đã được xử lý thành công",
          data: {
            orderId: orderId || lastPayment.order_id,
            transId: lastPayment.transaction_id,
            amount: lastPayment.amount,
          },
        });
      } else if (lastPayment.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Thanh toán đã bị hủy bỏ hoặc thất bại",
          error: lastPayment.error_message,
        });
      }
    }

    return res.status(202).json({
      success: false,
      message: "Thanh toán đang xử lý",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};
