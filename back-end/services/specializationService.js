import db from "../models/index.js";
import BadRequestError from "../errors/bad_request.js";

const { Specialization } = db;
export const createSpecialization = async ({ name, image, fees }) => {
  if (!name || !image || !fees) {
    throw new BadRequestError("Vui lòng cung cấp đầy đủ name, image, và fees");
  }
  const existingSpecialization = await Specialization.findOne({
    where: { name },
  });
  if (existingSpecialization) throw new BadRequestError("Khoa đã tồn tại");
  if (isNaN(fees) || fees <= 0) {
    throw new BadRequestError("Chi phí phải là một số lớn hơn 0");
  }
  if (!image.startsWith("http")) {
    throw new BadRequestError("Đường dẫn ảnh không hợp lệ");
  }
  //   if (req.user.role !== "admin") {
  //     throw new ForbiddenError("Bạn không có quyền tạo chuyên khoa");
  //   }
  const newSpecialization = await Specialization.create({ name, image, fees });
  return { message: "Thêm khoa thành công", specialization: newSpecialization };
};
