import rateLimit from "express-rate-limit";
import BadRequestError from "../errors/bad_request.js"; // bạn có thể đổi thành TooManyRequestsError nếu tạo riêng

export const createLimiter = (options) =>
  rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    handler: (req, res, next) => {
      next(new BadRequestError(options.message));
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  message: "Bạn đã đăng nhập quá nhiều lần. Hãy thử lại sau 15 phút.",
});

export const registerLimiter = createLimiter({
  windowMs: 30 * 60 * 1000, // 30 phút
  max: 5,
  message: "Bạn đã đăng ký quá nhiều lần. Hãy thử lại sau 30 phút.",
});

export const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 3,
  message:
    "Bạn đã yêu cầu quá nhiều lần đặt lại mật khẩu. Vui lòng thử lại sau 1 giờ.",
});
