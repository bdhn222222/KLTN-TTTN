import rateLimit from "express-rate-limit";
import BadRequestError from "../errors/bad_request.js"; // bạn có thể đổi thành TooManyRequestsError nếu tạo riêng

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // tối đa 10 request
  message: "Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau.",
  handler: (req, res, next, options) => {
    next(new BadRequestError(options.message));
  },
});

export default rateLimiter;
