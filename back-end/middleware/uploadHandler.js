import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";
import BadRequestError from "../errors/bad_request.js";

// Cấu hình lưu ảnh trực tiếp lên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "clinic_uploads", // Thư mục trên Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

// Cấu hình middleware multer
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Giới hạn 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new BadRequestError("Chỉ cho phép ảnh PNG, JPG, JPEG"));
    }
    cb(null, true);
  },
});

export default upload;
// Sử dụng middleware trong route
