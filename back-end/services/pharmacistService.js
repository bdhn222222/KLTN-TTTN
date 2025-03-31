import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import NotFoundError from "../errors/not_found.js";
import { Op } from "sequelize";
import dayjs from "dayjs";
const {
  User,
  Pharmacist,
  Prescription,
  Appointment,
  Payment,
  Patient,
  PrescriptionMedicine,
  Medicine,
} = db;
export const registerPharmacist = async ({
  username,
  email,
  password,
  license_number,
}) => {
  const existingPharmacist = await User.findOne({ where: { email } });
  if (existingPharmacist) throw new BadRequestError("Email đã được đăng ký");
  // const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = await User.create({
    username,
    email,
    // password: hashedPassword,
    password,
    role: "pharmacist",
  });
  const newPharmacist = await Pharmacist.create({
    user_id: newUser.user_id,
    license_number,
  });
  return {
    message: "Đăng ký account dược sĩ thành công",
    pharmacist: newPharmacist,
  };
};

export const loginPharmacist = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email, role: "pharmacist" },
    include: { model: Pharmacist, as: "pharmacist" },
  });

  if (!user) {
    throw new NotFoundError("Dược sĩ không tồn tại hoặc email không đúng");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Mật khẩu không chính xác");
  }

  const token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  return {
    message: "Đăng nhập thành công",
    token,
    pharmacist: {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role,
      license_number: user.pharmacist.license_number,
    },
  };
};
export const getPendingPrescriptions = async () => {
  const prescriptions = await Prescription.findAll({
    where: { dispensed: "false" },
    include: [
      {
        model: Appointment,
        as: "appointment",
        where: { status: "completed" },
        include: [
          {
            model: Payment,
            as: "payments",
            where: { status: "paid" },
          },
          {
            model: Patient,
            as: "patient",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["username", "email"],
              },
            ],
          },
        ],
      },
    ],
  });

  if (!prescriptions || prescriptions.length === 0) {
    throw new NotFoundError("Không có đơn thuốc nào cần xác nhận");
  }
  return prescriptions;
};

export const getPrescriptionDetails = async (prescription_id) => {
  const prescription = await Prescription.findByPk(prescription_id, {
    include: [
      {
        model: PrescriptionMedicine,
        as: "prescriptionMedicines",
        include: [
          {
            model: Medicine,
            as: "medicine",
            attributes: ["medicine_id", "name", "price", "unit", "expiry_date"],
          },
        ],
      },
      {
        model: Appointment,
        as: "appointment",
        include: {
          model: Patient,
          as: "patient",
          include: {
            model: User,
            as: "user",
            attributes: ["username", "email"],
          },
        },
      },
    ],
  });
  if (!prescription) {
    throw new NotFoundError("Không tìm thấy đơn thuốc");
  }
  return prescription;
};
export const updatePrescriptionItem = async (
  prescription_id,
  original_medicine_id,
  new_medicine_id,
  actual_quantity,
  note
) => {
  const prescription = await Prescription.findByPk(prescription_id);
  if (!prescription) throw new NotFoundError("Không tìm thấy đơn thuốc");
  if (prescription.dispensed) {
    throw new BadRequestError(
      "Đơn thuốc đã được xác nhận. Không thể chỉnh sửa"
    );
  }
  const item = await PrescriptionMedicine.findOne({
    where: {
      prescription_id,
      medicine_id: original_medicine_id,
    },
  });
  if (!item)
    throw new NotFoundError("Không tìm thấy thuốc gốc trong đơn thuốc");
  if (original_medicine_id === new_medicine_id) {
    // Pharmacist không đổi thuốc
    await item.update({
      actual_quantity,
      note,
    });
    return { message: "Đã cập nhật thuốc trong đơn thành công" };
  }
  await item.destroy(); // nếu có đổi thuốc, xóa thuốc cũ
  await PrescriptionMedicine.create({
    prescription_id,
    medicine_id: new_medicine_id,
    quantity: 0, // nếu muốn thể hiện đây là thuốc thay thế
    actual_quantity,
    note,
  });
  return { message: "Đã thay thuốc thành công trong đơn thuốc" };
};
export const confirmPrescription = async (prescription_id, pharmacist_id) => {
  const prescription = await Prescription.findByPk(prescription_id);
  if (!prescription) throw new NotFoundError("Không tìm thấy đơn thuốc");
  if (prescription.dispensed) {
    throw new BadRequestError("Đơn thuốc đã được xác nhận");
  }
  await prescription.update({
    dispensed: true,
    pharmacist_id,
  });
  return { message: "Đã xác nhận đơn thuốc thành công" };
};

export const getAllMedicines = async ({ search, expiry_before, page = 1 }) => {
  const limit = 10;
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { supplier: { [Op.like]: `%${search}%` } },
    ];
  }

  if (expiry_before) {
    whereClause.expiry_date = { [Op.lte]: new Date(expiry_before) };
  }

  const { count, rows } = await Medicine.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [["name", "ASC"]],
  });

  const formattedMedicines = rows.map((med) => ({
    ...med.toJSON(),
    status_message: med.is_out_of_stock ? "Tạm hết hàng" : "",
  }));

  return {
    message:
      count > 0 ? "Lấy danh sách thuốc thành công" : "Không tìm thấy thuốc nào",
    medicines: formattedMedicines,
    currentPage: +page,
    totalPages: Math.ceil(count / limit) || 1,
    totalRecords: count,
  };
};
export const addMedicine = async (medicineData) => {
  const { name, description, quantity, price, unit, expiry_date, supplier } =
    medicineData;
  medicineData.is_out_of_stock = Number(quantity) === 0;
  if (!name || !quantity || !price || !unit || !expiry_date) {
    throw new BadRequestError("Vui lòng nhập đầy đủ thông tin bắt buộc");
  }
  const existingMedicine = await Medicine.findOne({
    where: { name },
  });
  if (existingMedicine) {
    throw new BadRequestError("Tên thuốc đã tồn tại");
  }
  const newMedicine = await db.Medicine.create(medicineData);
  return {
    message: "Thêm thuốc vào kho thành công",
    medicine: newMedicine,
  };
};

export const updateMedicine = async (medicine_id, updateData) => {
  const medicine = await Medicine.findByPk(medicine_id);
  if (!medicine) {
    throw new NotFoundError("Không tìm thấy thuốc với ID này");
  }

  const allowedFields = [
    "name",
    "description",
    "quantity",
    "price",
    "unit",
    "expiry_date",
    "supplier",
  ];

  const validUpdateData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      validUpdateData[field] = updateData[field];
    }
  }

  if (Object.keys(validUpdateData).length === 0) {
    throw new BadRequestError("Không có thông tin hợp lệ để cập nhật");
  }

  // Validate
  if (
    validUpdateData.name !== undefined &&
    validUpdateData.name.trim() === ""
  ) {
    throw new BadRequestError("Tên thuốc không được để trống");
  }

  if (
    validUpdateData.price !== undefined &&
    (isNaN(validUpdateData.price) ||
      validUpdateData.price < 0 ||
      !Number.isInteger(Number(validUpdateData.price)))
  ) {
    throw new BadRequestError("Giá thuốc phải là số nguyên >= 0");
  }

  if (validUpdateData.quantity !== undefined) {
    const quantity = Number(validUpdateData.quantity);

    if (isNaN(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      throw new BadRequestError("Số lượng thuốc phải là số nguyên >= 0");
    }

    validUpdateData.quantity = quantity;
    validUpdateData.is_out_of_stock = quantity === 0;
  }

  if (
    validUpdateData.expiry_date !== undefined &&
    (!dayjs(validUpdateData.expiry_date).isValid() ||
      dayjs(validUpdateData.expiry_date).isBefore(dayjs()))
  ) {
    throw new BadRequestError("Ngày hết hạn phải hợp lệ và trong tương lai");
  }

  if (
    validUpdateData.unit !== undefined &&
    validUpdateData.unit.trim() === ""
  ) {
    throw new BadRequestError("Đơn vị thuốc không được để trống");
  }

  await medicine.update(validUpdateData);

  return {
    success: true,
    message: "Cập nhật thuốc thành công",
    data: medicine,
  };
};

export const getMedicineById = async (medicine_id) => {
  const medicine = await Medicine.findByPk(medicine_id);
  if (!medicine) {
    throw new NotFoundError("Không tìm thấy thuốc với ID này");
  }

  const data = medicine.toJSON();
  data.status_message = medicine.is_out_of_stock ? "Tạm hết hàng" : "";

  return {
    success: true,
    message: "Lấy thông tin thuốc thành công",
    data,
  };
};
