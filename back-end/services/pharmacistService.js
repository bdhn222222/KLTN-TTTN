import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import NotFoundError from "../errors/not_found.js";
import { Op } from "sequelize";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import InternalServerError from "../errors/internalServerError.js";
dayjs.extend(utc);
dayjs.extend(timezone);

const {
  User,
  Pharmacist,
  Prescription,
  Appointment,
  Payment,
  Patient,
  PrescriptionMedicine,
  Medicine,
  Batch,
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

export const getPrescriptionDetails = async (prescription_id) => {
  try {
    const prescription = await db.Prescription.findByPk(prescription_id, {
      include: [
        {
          model: db.PrescriptionMedicine,
          as: "prescriptionMedicines",
          attributes: [
            "prescription_medicine_id",
            "medicine_id",
            "quantity",
            "actual_quantity",
            "dosage",
            "frequency",
            "duration",
            "instructions",
          ],
          include: [
            {
              model: db.Medicine,
              as: "Medicine",
              attributes: [
                "medicine_id",
                "name",
                "price",
                "unit",
                // "is_out_of_stock",
                "quantity",
              ],
            },
          ],
        },
        {
          model: db.Appointment,
          as: "Appointment",
          attributes: ["appointment_id", "appointment_datetime", "status"],
          include: [
            {
              model: db.FamilyMember,
              as: "FamilyMember",
              // include: [
              //   {
              //     model: db.User,
              //     as: "user",
              //     attributes: ["username", "email"],
              //   },
              // ],
            },
            {
              model: db.Doctor,
              as: "Doctor",
              include: [
                {
                  model: db.User,
                  as: "user",
                  attributes: ["username", "email"],
                },
              ],
            },
          ],
        },
        {
          model: db.PrescriptionPayment,
          as: "prescriptionPayments",
          attributes: [
            "prescription_payment_id",
            "amount",
            "status",
            "payment_method",
          ],
        },
      ],
    });

    if (!prescription) {
      throw new NotFoundError("Không tìm thấy đơn thuốc");
    }

    // Format response data
    return {
      success: true,
      message: "Lấy thông tin đơn thuốc thành công",
      data: {
        prescription_id: prescription.prescription_id,
        created_at: dayjs(prescription.createdAt)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD HH:mm:ss"),
        appointment: {
          appointment_id: prescription.Appointment.appointment_id,
          datetime: dayjs(prescription.Appointment.appointment_datetime)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD HH:mm:ss"),
          status: prescription.Appointment.status,
          family_member: {
            name: prescription.Appointment.FamilyMember.username,
            email: prescription.Appointment.FamilyMember.email,
            date_of_birth: prescription.Appointment.FamilyMember.date_of_birth,
            gender: prescription.Appointment.FamilyMember.gender,
            relationship: prescription.Appointment.FamilyMember.relationship,
          },
          doctor: {
            name: prescription.Appointment.Doctor.user.username,
            email: prescription.Appointment.Doctor.user.email,
          },
        },
        medicines: prescription.prescriptionMedicines.map((item) => ({
          prescription_medicine_id: item.prescription_medicine_id,
          medicine: {
            medicine_id: item.Medicine.medicine_id,
            name: item.Medicine.name,
            unit: item.Medicine.unit,
            price: item.Medicine.price
              ? `${item.Medicine.price.toLocaleString("vi-VN")} VNĐ`
              : "0 VNĐ",
            // status: item.Medicine.is_out_of_stock ? "Tạm hết hàng" : "Còn hàng",
            description: item.Medicine.description || "Chưa có mô tả",
            supplier:
              item.Medicine.supplier || "Chưa có thông tin nhà cung cấp",
          },
          prescribed: {
            quantity: item.quantity || 0,
            dosage: item.dosage || "Chưa có thông tin",
            frequency: item.frequency || "Chưa có thông tin",
            duration: item.duration || "Chưa có thông tin",
            instructions: item.instructions || "Chưa có hướng dẫn",
          },
          dispensed: {
            quantity: item.actual_quantity || null,
          },
        })),
        payment: prescription.prescriptionPayments
          ? {
              payment_id:
                prescription.prescriptionPayments.prescription_payment_id,
              amount: prescription.prescriptionPayments.amount
                ? `${prescription.prescriptionPayments.amount.toLocaleString(
                    "vi-VN"
                  )} VNĐ`
                : "0 VNĐ",
              status: prescription.prescriptionPayments.status,
              payment_method: prescription.prescriptionPayments.payment_method,
            }
          : null,
      },
    };
  } catch (error) {
    console.error("Error fetching prescription details:", error);
    throw new InternalServerError("Lỗi khi lấy thông tin đơn thuốc");
  }
};

export const updatePrescriptionItem = async (
  prescription_id,
  original_medicine_id,
  new_medicine_id,
  actual_quantity,
  dosage,
  frequency,
  duration,
  instructions
) => {
  // Kiểm tra đơn thuốc tồn tại
  const prescription = await db.Prescription.findByPk(prescription_id);
  if (!prescription) {
    throw new NotFoundError("Không tìm thấy đơn thuốc");
  }

  // Kiểm tra trạng thái của đơn thuốc
  if (prescription.status === "cancelled") {
    throw new BadRequestError("Đơn thuốc đã bị hủy. Không thể chỉnh sửa");
  }

  if (prescription.status === "completed") {
    throw new BadRequestError("Đơn thuốc đã hoàn tất. Không thể chỉnh sửa");
  }

  // Tìm thuốc trong đơn
  const prescriptionMedicine = await db.PrescriptionMedicine.findOne({
    where: {
      prescription_id,
      medicine_id: original_medicine_id,
    },
    include: [
      {
        model: db.Medicine,
        as: "medicine",
      },
    ],
  });

  if (!prescriptionMedicine) {
    throw new NotFoundError("Không tìm thấy thuốc trong đơn");
  }

  // Kiểm tra số lượng thực tế
  if (
    isNaN(actual_quantity) ||
    !Number.isInteger(actual_quantity) ||
    actual_quantity < 0
  ) {
    throw new BadRequestError("Số lượng thuốc phải là số nguyên >= 0");
  }

  // Nếu số lượng = 0, xóa thuốc khỏi đơn
  if (actual_quantity === 0) {
    await prescriptionMedicine.destroy();
    return {
      success: true,
      message: "Đã xóa thuốc khỏi đơn thuốc",
      data: {
        prescription_medicine_id: prescriptionMedicine.prescription_medicine_id,
        medicine: {
          medicine_id: prescriptionMedicine.medicine.medicine_id,
          name: prescriptionMedicine.medicine.name,
          unit: prescriptionMedicine.medicine.unit,
        },
      },
    };
  }

  // Nếu không thay đổi thuốc
  if (original_medicine_id === new_medicine_id) {
    // Kiểm tra số lượng tồn kho
    if (actual_quantity > prescriptionMedicine.medicine.quantity) {
      throw new BadRequestError(
        `Thuốc ${prescriptionMedicine.medicine.name} không đủ số lượng trong kho hoặc đã hết hàng`
      );
    }

    // Cập nhật thông tin thuốc
    const updateData = {
      quantity: actual_quantity,
      total_price: prescriptionMedicine.medicine.price * actual_quantity,
      dosage: dosage || prescriptionMedicine.dosage,
      frequency: frequency || prescriptionMedicine.frequency,
      duration: duration || prescriptionMedicine.duration,
      instructions: instructions || prescriptionMedicine.instructions,
    };

    await prescriptionMedicine.update(updateData);

    return {
      success: true,
      message: "Cập nhật thông tin thuốc thành công",
      data: {
        prescription_medicine_id: prescriptionMedicine.prescription_medicine_id,
        medicine: {
          medicine_id: prescriptionMedicine.medicine.medicine_id,
          name: prescriptionMedicine.medicine.name,
          unit: prescriptionMedicine.medicine.unit,
          price: prescriptionMedicine.medicine.price
            ? `${prescriptionMedicine.medicine.price.toLocaleString(
                "vi-VN"
              )} VNĐ`
            : "0 VNĐ",
        },
        quantity: actual_quantity,
        total_price:
          prescriptionMedicine.medicine.price * actual_quantity
            ? `${(
                prescriptionMedicine.medicine.price * actual_quantity
              ).toLocaleString("vi-VN")} VNĐ`
            : "0 VNĐ",
        prescribed: {
          dosage: dosage || prescriptionMedicine.dosage || "Chưa có thông tin",
          frequency:
            frequency || prescriptionMedicine.frequency || "Chưa có thông tin",
          duration:
            duration || prescriptionMedicine.duration || "Chưa có thông tin",
          instructions:
            instructions ||
            prescriptionMedicine.instructions ||
            "Chưa có hướng dẫn",
        },
      },
    };
  }

  // Nếu thay đổi thuốc
  const newMedicine = await db.Medicine.findByPk(new_medicine_id);
  if (!newMedicine) {
    throw new NotFoundError("Không tìm thấy thuốc thay thế");
  }

  // Kiểm tra số lượng tồn kho của thuốc mới
  if (actual_quantity > newMedicine.quantity) {
    throw new BadRequestError(
      `Thuốc ${newMedicine.name} không đủ số lượng trong kho. Hiện chỉ còn ${newMedicine.quantity} ${newMedicine.unit}`
    );
  }

  // Xóa thuốc cũ
  await prescriptionMedicine.destroy();

  // Tạo thuốc mới với thông tin cập nhật
  const newPrescriptionMedicine = await db.PrescriptionMedicine.create({
    prescription_id,
    medicine_id: new_medicine_id,
    quantity: actual_quantity,
    unit_price: newMedicine.price,
    total_price: newMedicine.price * actual_quantity,
    dosage: dosage || prescriptionMedicine.dosage,
    frequency: frequency || prescriptionMedicine.frequency,
    duration: duration || prescriptionMedicine.duration,
    instructions: instructions || prescriptionMedicine.instructions,
  });

  return {
    success: true,
    message: "Thay thế thuốc thành công",
    data: {
      prescription_medicine_id:
        newPrescriptionMedicine.prescription_medicine_id,
      original_medicine: {
        medicine_id: prescriptionMedicine.medicine.medicine_id,
        name: prescriptionMedicine.medicine.name,
        unit: prescriptionMedicine.medicine.unit,
        price: prescriptionMedicine.medicine.price
          ? `${prescriptionMedicine.medicine.price.toLocaleString("vi-VN")} VNĐ`
          : "0 VNĐ",
      },
      new_medicine: {
        medicine_id: newMedicine.medicine_id,
        name: newMedicine.name,
        unit: newMedicine.unit,
        price: newMedicine.price
          ? `${newMedicine.price.toLocaleString("vi-VN")} VNĐ`
          : "0 VNĐ",
      },
      quantity: actual_quantity,
      total_price:
        newMedicine.price * actual_quantity
          ? `${(newMedicine.price * actual_quantity).toLocaleString(
              "vi-VN"
            )} VNĐ`
          : "0 VNĐ",
      prescribed: {
        dosage: dosage || prescriptionMedicine.dosage || "Chưa có thông tin",
        frequency:
          frequency || prescriptionMedicine.frequency || "Chưa có thông tin",
        duration:
          duration || prescriptionMedicine.duration || "Chưa có thông tin",
        instructions:
          instructions ||
          prescriptionMedicine.instructions ||
          "Chưa có hướng dẫn",
      },
    },
  };
};

export const completePrescription = async (prescription_id, pharmacist_id) => {
  const prescription = await db.Prescription.findByPk(prescription_id, {
    include: [
      {
        model: db.PrescriptionMedicine,
        as: "prescriptionMedicines",
        include: [
          {
            model: db.Medicine,
            as: "medicine",
          },
        ],
      },
      {
        model: db.PrescriptionPayment,
        as: "prescriptionPayments",
      },
    ],
  });

  if (!prescription) {
    throw new NotFoundError("Không tìm thấy đơn thuốc");
  }

  if (prescription.status === "completed") {
    throw new BadRequestError("Đơn thuốc đã được xác nhận phát thuốc trước đó");
  }

  if (
    !prescription.prescriptionMedicines ||
    prescription.prescriptionMedicines.length === 0
  ) {
    throw new BadRequestError("Đơn thuốc không có thuốc để xác nhận");
  }

  // Kiểm tra thanh toán
  if (
    !prescription.prescriptionPayments ||
    prescription.prescriptionPayments.status !== "paid"
  ) {
    throw new BadRequestError("Đơn thuốc chưa được thanh toán");
  }

  // Kiểm tra số lượng thuốc thực tế
  for (const item of prescription.prescriptionMedicines) {
    if (!item.actual_quantity && item.actual_quantity !== 0) {
      throw new BadRequestError(
        `Chưa nhập số lượng thực tế cho thuốc ${item.medicine.name}`
      );
    }

    // Kiểm tra số lượng tồn kho
    // if (item.medicine.is_out_of_stock) {
    //   throw new BadRequestError(`Thuốc ${item.medicine.name} đã hết hàng`);
    // }

    // Cập nhật trạng thái hết hàng
    // await item.medicine.update({
    //   is_out_of_stock: true,
    // });
  }

  // Cập nhật đơn thuốc đã được phát
  await prescription.update({
    status: "completed",
    pharmacist_id,
    completed_at: new Date(),
  });

  return {
    success: true,
    message: "Xác nhận phát thuốc thành công",
    data: {
      prescription_id: prescription.prescription_id,
      completed_at: dayjs(prescription.completed_at)
        .tz("Asia/Ho_Chi_Minh")
        .format("YYYY-MM-DD HH:mm:ss"),
      pharmacist_id: prescription.pharmacist_id,
      medicines: prescription.prescriptionMedicines.map((item) => ({
        medicine_name: item.medicine.name,
        actual_quantity: item.actual_quantity,
        remaining_quantity: item.medicine.quantity - item.actual_quantity,
      })),
    },
  };
};

export const confirmPrescriptionPreparation = async (
  prescription_id,
  pharmacist_id
) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id: pharmacist_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
    });

    if (!pharmacist) {
      console.log("Không tìm thấy pharmacist với user_id:", pharmacist_id);
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    console.log("Found pharmacist:", {
      pharmacist_id: pharmacist.pharmacist_id,
      user_id: pharmacist.user_id,
      username: pharmacist.user?.username,
    });

    // 2. Kiểm tra đơn thuốc tồn tại
    const prescription = await db.Prescription.findByPk(prescription_id, {
      include: [
        {
          model: db.PrescriptionMedicine,
          as: "prescriptionMedicines",
          include: [
            {
              model: db.Medicine,
              as: "medicine",
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!prescription) {
      throw new NotFoundError("Không tìm thấy đơn thuốc");
    }

    // 3. Kiểm tra trạng thái xác nhận
    if (prescription.status !== "pending_prepare") {
      throw new BadRequestError("Đơn thuốc không ở trạng thái chờ chuẩn bị");
    }

    // 4. Kiểm tra danh sách thuốc
    if (
      !prescription.prescriptionMedicines ||
      prescription.prescriptionMedicines.length === 0
    ) {
      throw new BadRequestError("Đơn thuốc không có thuốc để xác nhận");
    }

    // 5. Tính tổng tiền và kiểm tra số lượng tồn kho
    let totalAmount = 0;
    for (const item of prescription.prescriptionMedicines) {
      // Kiểm tra số lượng tồn kho
      if (item.quantity > item.medicine.quantity) {
        throw new BadRequestError(
          `Thuốc ${item.medicine.name} không đủ số lượng trong kho. Hiện chỉ còn ${item.medicine.quantity} ${item.medicine.unit}`
        );
      }

      // Tính tiền cho từng loại thuốc
      const itemTotal = item.quantity * item.medicine.price;
      totalAmount += itemTotal;
    }

    // 6. Tạo bản ghi thanh toán đơn thuốc
    const prescriptionPayment = await db.PrescriptionPayment.create(
      {
        prescription_id: prescription.prescription_id,
        amount: totalAmount,
        status: "pending",
        created_by: pharmacist.pharmacist_id,
        createdAt: new Date(),
      },
      { transaction: t }
    );

    // 7. Cập nhật đơn thuốc
    await prescription.update(
      {
        status: "waiting_payment",
        pharmacist_id: pharmacist.pharmacist_id,
        confirmed_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    // 8. Trả về kết quả
    return {
      success: true,
      message: "Xác nhận chuẩn bị thuốc thành công",
      data: {
        prescription_id: prescription.prescription_id,
        confirmed_at: dayjs(prescription.confirmed_at)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD HH:mm:ss"),
        payment: {
          prescription_payment_id: prescriptionPayment.prescription_payment_id,
          amount: `${totalAmount.toLocaleString("vi-VN")} VNĐ`,
          status: prescriptionPayment.status,
        },
        medicines: prescription.prescriptionMedicines.map((item) => ({
          medicine_id: item.medicine.medicine_id,
          name: item.medicine.name,
          quantity: item.quantity,
          unit: item.medicine.unit,
          unit_price: `${item.medicine.price.toLocaleString("vi-VN")} VNĐ`,
          total_price: `${(item.quantity * item.medicine.price).toLocaleString(
            "vi-VN"
          )} VNĐ`,
          prescribed: {
            dosage: item.dosage || "Chưa có thông tin",
            frequency: item.frequency || "Chưa có thông tin",
            duration: item.duration || "Chưa có thông tin",
            instructions: item.instructions || "Chưa có hướng dẫn",
          },
        })),
        pharmacist: {
          pharmacist_id: pharmacist.pharmacist_id,
          name: pharmacist.user ? pharmacist.user.username : null,
        },
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
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
    // status_message: med.is_out_of_stock ? "Tạm hết hàng" : "",
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
  try {
    const { name, unit, price, description } = medicineData;

    // 1. Validate bắt buộc
    if (!name || !unit || !price) {
      throw new BadRequestError(
        "Vui lòng nhập đủ tên thuốc (name), đơn vị (unit) và giá (price)"
      );
    }

    // 2. Không cho phép thuốc trùng tên
    const exists = await Medicine.findOne({ where: { name } });
    if (exists) {
      throw new BadRequestError("Tên thuốc đã tồn tại");
    }

    // 3. Tạo Medicine
    const newMedicine = await Medicine.create({
      name,
      unit,
      price,
      description,
    });

    return {
      message: "Thêm thuốc thành công",
      medicine: newMedicine,
    };
  } catch (error) {
    throw new BadRequestError("Lỗi khi thêm thuốc: " + error.message);
  }
};

export const updateMedicine = async (medicine_id, updateData) => {
  const medicine = await Medicine.findByPk(medicine_id);
  if (!medicine) {
    throw new NotFoundError("Không tìm thấy thuốc với ID này");
  }

  const allowedFields = [
    "name",
    "description",
    // "quantity",
    "price",
    "unit",
    // "expiry_date",
    "supplier",
  ];

  const validUpdateData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === "name") {
        const exists = await Medicine.findOne({
          where: { name: updateData[field] },
        });
        if (exists) {
          throw new BadRequestError("Tên thuốc đã tồn tại");
        }
      }
      validUpdateData[field] = updateData[field];
    }
  }

  if (Object.keys(validUpdateData).length === 0) {
    throw new BadRequestError("Không có thông tin hợp lệ để cập nhật");
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
  // data.status_message = medicine.is_out_of_stock ? "Tạm hết hàng" : "";

  return {
    success: true,
    message: "Lấy thông tin thuốc thành công",
    data,
  };
};

export const deleteMedicine = async (medicine_id) => {
  const medicine = await db.Medicine.findByPk(medicine_id);
  if (!medicine) {
    throw new NotFoundError("Không tìm thấy thuốc với ID này");
  }

  await medicine.destroy();

  return {
    success: true,
    message: "Xóa thuốc thành công",
  };
};

export const getPharmacistProfile = async (user_id) => {
  const pharmacist = await db.Pharmacist.findOne({
    where: { user_id },
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["username", "email", "avatar"],
      },
    ],
  });

  if (!pharmacist) {
    throw new NotFoundError("Không tìm thấy hồ sơ dược sĩ");
  }

  return {
    user_id,
    username: pharmacist.user.username,
    email: pharmacist.user.email,
    avatar: pharmacist.user.avatar,
    phone_number: pharmacist.phone_number,
    address: pharmacist.address,
    gender: pharmacist.gender,
    date_of_birth: pharmacist.date_of_birth,
    id_number: pharmacist.id_number,
  };
};

export const updatePharmacistProfile = async (user_id, updateData) => {
  const user = await db.User.findByPk(user_id);
  if (!user) throw new NotFoundError("Không tìm thấy người dùng");

  const pharmacist = await db.Pharmacist.findOne({ where: { user_id } });
  if (!pharmacist) throw new NotFoundError("Không tìm thấy hồ sơ dược sĩ");

  const userFields = ["username", "avatar"];
  const pharmacistFields = ["license_number"];

  const userUpdate = {};
  const pharmacistUpdate = {};
  // Xử lý các field của User
  for (const field of userFields) {
    if (updateData[field] !== undefined) {
      if (
        typeof updateData[field] !== "string" ||
        updateData[field].trim() === ""
      ) {
        throw new BadRequestError(`${field} không được để trống`);
      }
      userUpdate[field] = updateData[field].trim();
    }
  }
  // Xử lý field của Pharmacist
  for (const field of pharmacistFields) {
    if (updateData[field] !== undefined) {
      if (
        typeof updateData[field] !== "string" ||
        updateData[field].trim() === ""
      ) {
        throw new BadRequestError(`${field} không được để trống`);
      }
      pharmacistUpdate[field] = updateData[field].trim();
    }
  }

  if (
    Object.keys(userUpdate).length === 0 &&
    Object.keys(pharmacistUpdate).length === 0
  ) {
    throw new BadRequestError("Không có thông tin hợp lệ để cập nhật");
  }

  // Cập nhật nếu có
  if (Object.keys(userUpdate).length > 0) await user.update(userUpdate);
  if (Object.keys(pharmacistUpdate).length > 0)
    await pharmacist.update(pharmacistUpdate);

  return {
    success: true,
    message: "Cập nhật hồ sơ cá nhân thành công",
    data: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      license_number: pharmacist.license_number,
    },
  };
};

export const changePharmacistPassword = async (user_id, data) => {
  const { oldPassword, newPassword, confirmPassword } = data;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new BadRequestError("Vui lòng nhập đầy đủ thông tin");
  }

  const user = await db.User.findByPk(user_id);
  if (!user) throw new NotFoundError("Không tìm thấy người dùng");

  const isMatch = await user.checkPassword(oldPassword);
  if (!isMatch) {
    throw new BadRequestError("Mật khẩu cũ không đúng");
  }

  if (newPassword !== confirmPassword) {
    throw new BadRequestError("Mật khẩu xác nhận không khớp");
  }
};

/**
 * Từ chối đơn thuốc
 * @param {number} prescription_id - ID của đơn thuốc
 * @param {string} reason - Lý do từ chối
 * @param {number} user_id - ID của user dược sĩ
 * @returns {Promise<Object>} - Thông tin đơn thuốc đã từ chối
 */
export const rejectPrescription = async (prescription_id, reason, user_id) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
    });

    if (!pharmacist) {
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    // 2. Kiểm tra đơn thuốc tồn tại
    const prescription = await db.Prescription.findByPk(prescription_id, {
      include: [
        {
          model: db.Appointment,
          as: "Appointment",
          include: [
            {
              model: db.Patient,
              as: "Patient",
              include: [
                {
                  model: db.User,
                  as: "user",
                  attributes: ["username", "email"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!prescription) {
      throw new NotFoundError("Không tìm thấy đơn thuốc");
    }

    // 3. Kiểm tra điều kiện từ chối
    if (!prescription.use_hospital_pharmacy) {
      throw new BadRequestError(
        "Đơn thuốc này không sử dụng nhà thuốc bệnh viện"
      );
    }

    if (
      prescription.status === "completed" ||
      prescription.status === "cancelled"
    ) {
      throw new BadRequestError(
        "Không thể từ chối đơn thuốc đã hoàn tất hoặc đã hủy"
      );
    }

    // 4. Cập nhật đơn thuốc
    await prescription.update(
      {
        status: "cancelled",
        cancel_reason: reason,
        cancelled_at: new Date(),
        cancelled_by: pharmacist.pharmacist_id,
      },
      { transaction: t }
    );

    // 5. Nếu đã có payment, cập nhật trạng thái payment thành cancelled
    const prescriptionPayment = await db.PrescriptionPayment.findOne({
      where: { prescription_id },
      transaction: t,
    });

    if (prescriptionPayment && prescriptionPayment.status === "pending") {
      await prescriptionPayment.update(
        {
          status: "cancelled",
          updated_by: pharmacist.pharmacist_id,
          note: `Đơn thuốc bị từ chối: ${reason}`,
        },
        { transaction: t }
      );
    }

    await t.commit();

    // 6. Trả về kết quả
    return {
      success: true,
      message: "Từ chối đơn thuốc thành công",
      data: {
        prescription_id: prescription.prescription_id,
        cancelled_at: dayjs(prescription.cancelled_at)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD HH:mm:ss"),
        cancel_reason: prescription.cancel_reason,
        pharmacist: {
          pharmacist_id: pharmacist.pharmacist_id,
          name: pharmacist.user.username,
        },
        patient: {
          name: prescription.Appointment.Patient.user.username,
          email: prescription.Appointment.Patient.user.email,
        },
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Lấy danh sách đơn thuốc
 * @param {Object} params - Các tham số lọc và phân trang
 * @param {string} params.start_date - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} params.end_date - Ngày kết thúc (YYYY-MM-DD)
 * @param {string} params.date - Ngày cụ thể (YYYY-MM-DD)
 * @param {string} params.payment_status - Trạng thái thanh toán (pending, paid, cancelled)
 * @param {string} params.status - Trạng thái đơn thuốc (pending_prepare, waiting_payment, completed, cancelled)
 * @param {number} params.page - Trang hiện tại
 * @param {number} params.limit - Số bản ghi trên mỗi trang
 * @returns {Promise<Object>} Danh sách đơn thuốc và thông tin phân trang
 */
export const getAllPrescriptions = async ({
  start_date,
  end_date,
  date,
  payment_status,
  status,
  page = 1,
  limit = 10,
}) => {
  const offset = (page - 1) * limit;
  const whereClause = {
    use_hospital_pharmacy: true, // Chỉ lấy đơn thuốc được phát tại nhà thuốc bệnh viện
  };
  const paymentWhereClause = {};

  // Lọc theo thời gian
  if (start_date || end_date) {
    whereClause.createdAt = {};
    if (start_date) {
      whereClause.createdAt[Op.gte] = dayjs
        .tz(start_date, "Asia/Ho_Chi_Minh")
        .startOf("day")
        .toDate();
    }
    if (end_date) {
      whereClause.createdAt[Op.lte] = dayjs
        .tz(end_date, "Asia/Ho_Chi_Minh")
        .endOf("day")
        .toDate();
    }
  }
  if (date) {
    const startOfDay = dayjs
      .tz(date, "Asia/Ho_Chi_Minh")
      .startOf("day")
      .toDate();
    const endOfDay = dayjs.tz(date, "Asia/Ho_Chi_Minh").endOf("day").toDate();
    whereClause.createdAt = {
      [Op.between]: [startOfDay, endOfDay],
    };
  }

  // Lọc theo trạng thái thanh toán
  if (payment_status) {
    paymentWhereClause.status = payment_status;
  }

  // Lọc theo trạng thái đơn thuốc
  if (status) {
    whereClause.status = status;
  }

  // Log điều kiện tìm kiếm để debug
  console.log("Search Conditions:", {
    whereClause,
    paymentWhereClause,
    page,
    limit,
    offset,
  });

  // Thực hiện truy vấn
  const { count, rows } = await db.Prescription.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: db.PrescriptionMedicine,
        as: "prescriptionMedicines",
        required: false,
        attributes: [
          "prescription_medicine_id",
          "medicine_id",
          "quantity",
          "actual_quantity",
          "dosage",
          "frequency",
          "duration",
          "instructions",
          "unit_price",
          "total_price",
          "note",
        ],
        include: [
          {
            model: db.Medicine,
            as: "Medicine",
            attributes: [
              "medicine_id",
              "name",
              "unit",
              "price",
              // "is_out_of_stock",
              "description",
              "supplier",
            ],
          },
        ],
      },
      {
        model: db.Appointment,
        as: "Appointment",
        required: false,
        attributes: [
          "appointment_id",
          "appointment_datetime",
          "status",
          "fees",
          "cancelled_at",
          "cancelled_by",
          "cancel_reason",
        ],
        include: [
          {
            model: db.FamilyMember,
            as: "FamilyMember",
            required: false,
            attributes: [
              "family_member_id",
              "username",
              "email",
              "phone_number",
              "gender",
              "date_of_birth",
              "relationship",
            ],
          },
          {
            model: db.Doctor,
            as: "Doctor",
            required: false,
            include: [
              {
                model: db.User,
                as: "user",
                required: false,
                attributes: ["username", "email"],
              },
            ],
          },
        ],
      },
      {
        model: db.PrescriptionPayment,
        as: "prescriptionPayments",
        where: paymentWhereClause,
        required: !!payment_status,
        attributes: [
          "prescription_payment_id",
          "amount",
          "status",
          "payment_method",
          "payment_date",
          "note",
          "created_by",
          "updated_by",
        ],
      },
      {
        model: db.Pharmacist,
        as: "pharmacist",
        required: false,
        include: [
          {
            model: db.User,
            as: "user",
            required: false,
            attributes: ["username", "email"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  // Format dữ liệu trả về
  const prescriptions = rows.map((prescription) => ({
    prescription_id: prescription.prescription_id,
    created_at: dayjs(prescription.createdAt)
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DD HH:mm:ss"),
    status: prescription.status,
    status_info: {
      confirmed_at: prescription.confirmed_at
        ? dayjs(prescription.confirmed_at)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD HH:mm:ss")
        : null,
      completed_at: prescription.completed_at
        ? dayjs(prescription.completed_at)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD HH:mm:ss")
        : null,
      cancelled_at: prescription.cancelled_at
        ? dayjs(prescription.cancelled_at)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD HH:mm:ss")
        : null,
      rejected_at: prescription.rejected_at
        ? dayjs(prescription.rejected_at)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD HH:mm:ss")
        : null,
      rejection_reason: prescription.rejection_reason,
      cancel_reason: prescription.cancel_reason,
    },
    appointment: prescription.Appointment
      ? {
          appointment_id: prescription.Appointment.appointment_id,
          datetime: prescription.Appointment.appointment_datetime
            ? dayjs(prescription.Appointment.appointment_datetime)
                .tz("Asia/Ho_Chi_Minh")
                .format("YYYY-MM-DD HH:mm:ss")
            : null,
          status: prescription.Appointment.status,
          fees: prescription.Appointment.fees
            ? `${prescription.Appointment.fees.toLocaleString("vi-VN")} VNĐ`
            : "0 VNĐ",
          cancelled_info: prescription.Appointment.cancelled_at
            ? {
                cancelled_at: dayjs(prescription.Appointment.cancelled_at)
                  .tz("Asia/Ho_Chi_Minh")
                  .format("YYYY-MM-DD HH:mm:ss"),
                cancelled_by: prescription.Appointment.cancelled_by,
                cancel_reason: prescription.Appointment.cancel_reason,
              }
            : null,
          family_member: prescription.Appointment.FamilyMember
            ? {
                name: prescription.Appointment.FamilyMember.username,
                email: prescription.Appointment.FamilyMember.email,
                phone_number:
                  prescription.Appointment.FamilyMember.phone_number,
                gender: prescription.Appointment.FamilyMember.gender,
                date_of_birth: prescription.Appointment.FamilyMember
                  .date_of_birth
                  ? dayjs(prescription.Appointment.FamilyMember.date_of_birth)
                      .tz("Asia/Ho_Chi_Minh")
                      .format("YYYY-MM-DD")
                  : null,
                relationship:
                  prescription.Appointment.FamilyMember.relationship,
              }
            : null,
          doctor: prescription.Appointment.Doctor?.user
            ? {
                name: prescription.Appointment.Doctor.user.username,
                email: prescription.Appointment.Doctor.user.email,
              }
            : null,
        }
      : null,
    medicines:
      prescription.prescriptionMedicines?.map((item) => ({
        prescription_medicine_id: item.prescription_medicine_id,
        medicine: item.Medicine
          ? {
              medicine_id: item.Medicine.medicine_id,
              name: item.Medicine.name,
              unit: item.Medicine.unit,
              price: item.Medicine.price
                ? `${item.Medicine.price.toLocaleString("vi-VN")} VNĐ`
                : "0 VNĐ",
              // status: item.Medicine.is_out_of_stock
              //   ? "Tạm hết hàng"
              //   : "Còn hàng",
              description: item.Medicine.description || "Chưa có mô tả",
              supplier:
                item.Medicine.supplier || "Chưa có thông tin nhà cung cấp",
            }
          : null,
        prescribed: {
          quantity: item.quantity || 0,
          dosage: item.dosage || "Chưa có thông tin",
          frequency: item.frequency || "Chưa có thông tin",
          duration: item.duration || "Chưa có thông tin",
          instructions: item.instructions || "Chưa có hướng dẫn",
          note: item.note,
          unit_price: item.unit_price
            ? `${item.unit_price.toLocaleString("vi-VN")} VNĐ`
            : "0 VNĐ",
          total_price: item.total_price
            ? `${item.total_price.toLocaleString("vi-VN")} VNĐ`
            : "0 VNĐ",
        },
        dispensed: {
          quantity: item.actual_quantity || null,
        },
      })) || [],
    payment: prescription.prescriptionPayments
      ? {
          payment_id: prescription.prescriptionPayments.prescription_payment_id,
          amount: prescription.prescriptionPayments.amount
            ? `${prescription.prescriptionPayments.amount.toLocaleString(
                "vi-VN"
              )} VNĐ`
            : "0 VNĐ",
          status: prescription.prescriptionPayments.status,
          payment_method: prescription.prescriptionPayments.payment_method,
          payment_date: prescription.prescriptionPayments.payment_date
            ? dayjs(prescription.prescriptionPayments.payment_date)
                .tz("Asia/Ho_Chi_Minh")
                .format("YYYY-MM-DD HH:mm:ss")
            : null,
          note: prescription.prescriptionPayments.note,
          created_by: prescription.prescriptionPayments.created_by,
          updated_by: prescription.prescriptionPayments.updated_by,
        }
      : null,
    pharmacist: prescription.pharmacist?.user
      ? {
          pharmacist_id: prescription.pharmacist.pharmacist_id,
          name: prescription.pharmacist.user.username,
          email: prescription.pharmacist.user.email,
        }
      : null,
  }));

  return {
    success: true,
    message:
      prescriptions.length > 0
        ? "Lấy danh sách đơn thuốc thành công"
        : "Không tìm thấy đơn thuốc nào",
    data: {
      prescriptions,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_records: count,
        per_page: limit,
      },
    },
  };
};

/**
 * Cập nhật trạng thái thanh toán đơn thuốc
 * @param {number} user_id - ID của user dược sĩ
 * @param {number} prescription_payment_id - ID của thanh toán đơn thuốc
 * @param {string} payment_method - Phương thức thanh toán (cash, zalopay)
 * @param {string} note - Ghi chú (nếu có)
 * @returns {Promise<Object>} - Thông tin thanh toán đã cập nhật
 */
export const updatePrescriptionPaymentStatus = async (
  user_id,
  prescription_payment_id,
  payment_method,
  note = ""
) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
    });

    if (!pharmacist) {
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    // 2. Kiểm tra thanh toán tồn tại
    const prescriptionPayment = await db.PrescriptionPayment.findOne({
      where: { prescription_payment_id },
      include: [
        {
          model: db.Prescription,
          as: "prescription",
          include: [
            {
              model: db.Appointment,
              as: "Appointment",
              include: [
                {
                  model: db.Patient,
                  as: "Patient",
                  include: [
                    {
                      model: db.User,
                      as: "user",
                      attributes: ["username", "email"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!prescriptionPayment) {
      throw new NotFoundError("Không tìm thấy thanh toán đơn thuốc");
    }

    // 3. Kiểm tra trạng thái hiện tại
    if (prescriptionPayment.status === "paid") {
      throw new BadRequestError("Đơn thuốc đã được thanh toán trước đó");
    }

    if (prescriptionPayment.status === "cancelled") {
      throw new BadRequestError("Đơn thuốc đã bị hủy");
    }

    // 4. Kiểm tra phương thức thanh toán hợp lệ
    const validPaymentMethods = ["cash", "zalopay"];
    if (!validPaymentMethods.includes(payment_method)) {
      throw new BadRequestError("Phương thức thanh toán không hợp lệ");
    }

    let status = "pending";
    let paymentDate = null;

    // 5. Xử lý theo phương thức thanh toán
    switch (payment_method) {
      case "cash":
        // Thanh toán tiền mặt -> tự động chuyển trạng thái thành paid
        status = "paid";
        paymentDate = new Date();
        break;

      case "zalopay":
        // TODO: Tích hợp ZaloPay trong tương lai
        // Hiện tại throw error vì chưa hỗ trợ
        throw new BadRequestError(
          "Phương thức thanh toán ZaloPay chưa được hỗ trợ"
        );
        break;
    }

    // 6. Cập nhật thanh toán
    await prescriptionPayment.update(
      {
        status,
        payment_method,
        note: note || prescriptionPayment.note,
        payment_date: paymentDate,
        updated_by: pharmacist.pharmacist_id,
      },
      { transaction: t }
    );

    // 7. Nếu thanh toán thành công, cập nhật trạng thái đơn thuốc
    if (status === "paid") {
      await prescriptionPayment.prescription.update(
        {
          status: "completed",
          completed_at: new Date(),
          pharmacist_id: pharmacist.pharmacist_id,
        },
        { transaction: t }
      );
    }

    await t.commit();

    // 8. Trả về kết quả
    return {
      success: true,
      message: "Cập nhật trạng thái thanh toán đơn thuốc thành công",
      data: {
        prescription_payment_id: prescriptionPayment.prescription_payment_id,
        prescription_id: prescriptionPayment.prescription_id,
        amount: `${prescriptionPayment.amount.toLocaleString("vi-VN")} VNĐ`,
        status: prescriptionPayment.status,
        payment_method: prescriptionPayment.payment_method,
        payment_date: prescriptionPayment.payment_date
          ? dayjs(prescriptionPayment.payment_date)
              .tz("Asia/Ho_Chi_Minh")
              .format("YYYY-MM-DD HH:mm:ss")
          : null,
        note: prescriptionPayment.note,
        patient: {
          name: prescriptionPayment.prescription.Appointment.Patient.user
            .username,
          email:
            prescriptionPayment.prescription.Appointment.Patient.user.email,
        },
        pharmacist: {
          pharmacist_id: pharmacist.pharmacist_id,
          name: pharmacist.user.username,
        },
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Lấy danh sách thanh toán đơn thuốc
 * @param {Object} params - Các tham số lọc và phân trang
 * @param {string} params.status - Trạng thái thanh toán (pending, paid, cancelled)
 * @param {string} params.start_date - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} params.end_date - Ngày kết thúc (YYYY-MM-DD)
 * @param {number} params.page - Trang hiện tại
 * @param {number} params.limit - Số bản ghi trên mỗi trang
 * @returns {Promise<Object>} Danh sách thanh toán và thông tin phân trang
 */
export const getAllPrescriptionPayments = async ({
  status,
  start_date,
  end_date,
  page = 1,
  limit = 10,
}) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  // Lọc theo trạng thái
  if (status) {
    whereClause.status = status;
  }

  // Lọc theo thời gian
  if (start_date || end_date) {
    whereClause.createdAt = {};
    if (start_date) {
      whereClause.createdAt[Op.gte] = dayjs
        .tz(start_date, "Asia/Ho_Chi_Minh")
        .startOf("day")
        .toDate();
    }
    if (end_date) {
      whereClause.createdAt[Op.lte] = dayjs
        .tz(end_date, "Asia/Ho_Chi_Minh")
        .endOf("day")
        .toDate();
    }
  }

  // Thực hiện truy vấn - không giới hạn theo dược sĩ
  const { count, rows } = await db.PrescriptionPayment.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: db.Prescription,
        as: "prescription",
        required: true,
        where: {
          use_hospital_pharmacy: true,
        },
        attributes: ["prescription_id", "status", "use_hospital_pharmacy"],
        include: [
          {
            model: db.Appointment,
            as: "Appointment",
            attributes: ["appointment_id", "appointment_datetime"],
            include: [
              {
                model: db.Patient,
                as: "Patient",
                include: [
                  {
                    model: db.User,
                    as: "user",
                    attributes: ["username", "email"],
                  },
                ],
              },
              {
                model: db.Doctor,
                as: "Doctor",
                include: [
                  {
                    model: db.User,
                    as: "user",
                    attributes: ["username", "email"],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  // Format dữ liệu trả về
  const payments = rows.map((payment) => ({
    payment_id: payment.prescription_payment_id,
    prescription_id: payment.prescription_id,
    amount: payment.amount
      ? `${payment.amount.toLocaleString("vi-VN")} VNĐ`
      : "0 VNĐ",
    status: payment.status,
    payment_method: payment.payment_method,
    created_at: dayjs(payment.createdAt)
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DD HH:mm:ss"),
    payment_date: payment.payment_date
      ? dayjs(payment.payment_date)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD HH:mm:ss")
      : null,
    note: payment.note,
    prescription: payment.prescription
      ? {
          prescription_id: payment.prescription.prescription_id,
          status: payment.prescription.status,
          appointment: payment.prescription.Appointment
            ? {
                appointment_id: payment.prescription.Appointment.appointment_id,
                datetime: dayjs(
                  payment.prescription.Appointment.appointment_datetime
                )
                  .tz("Asia/Ho_Chi_Minh")
                  .format("YYYY-MM-DD HH:mm:ss"),
                patient: payment.prescription.Appointment.Patient?.user
                  ? {
                      name: payment.prescription.Appointment.Patient.user
                        .username,
                      email:
                        payment.prescription.Appointment.Patient.user.email,
                    }
                  : null,
                doctor: payment.prescription.Appointment.Doctor?.user
                  ? {
                      name: payment.prescription.Appointment.Doctor.user
                        .username,
                      email: payment.prescription.Appointment.Doctor.user.email,
                    }
                  : null,
              }
            : null,
        }
      : null,
  }));

  return {
    success: true,
    message:
      payments.length > 0
        ? "Lấy danh sách thanh toán đơn thuốc thành công"
        : "Không tìm thấy thanh toán đơn thuốc nào",
    data: {
      payments,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_records: count,
        per_page: limit,
      },
    },
  };
};

/**
 * Tạo đơn thuốc bán lẻ
 * @param {Object} data - Dữ liệu đơn thuốc
 * @param {number} data.patient_id - ID của bệnh nhân
 * @param {string} data.note - Ghi chú về đơn thuốc
 * @param {Array} data.medicines - Danh sách thuốc
 * @param {number} data.medicines[].medicine_id - ID của thuốc
 * @param {number} data.medicines[].quantity - Số lượng thuốc
 * @param {string} data.medicines[].dosage - Liều dùng
 * @param {string} data.medicines[].frequency - Tần suất sử dụng
 * @param {string} data.medicines[].duration - Thời gian sử dụng
 * @param {string} data.medicines[].instructions - Hướng dẫn sử dụng
 * @param {number} pharmacist_id - ID của dược sĩ tạo đơn
 * @returns {Promise<Object>} Thông tin đơn thuốc đã tạo
 */

export const createRetailPrescription = async (data, pharmacist_id) => {
  const t = await db.sequelize.transaction(); // Bắt đầu transaction

  try {
    // 1. Kiểm tra bệnh nhân tồn tại
    const patient = await db.Patient.findByPk(data.patient_id, {
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username", "email"],
        },
      ],
    });

    if (!patient) {
      throw new NotFoundError("Không tìm thấy thông tin bệnh nhân");
    }

    // 2. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id: pharmacist_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
    });

    if (!pharmacist) {
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    // 3. Tạo đơn thuốc mới
    const retail_prescription_id = await db.RetailPrescription.create(
      {
        patient_id: data.patient_id,
        pharmacist_id: pharmacist.pharmacist_id,
        status: "pending_prepare", // Trạng thái mới
        medicine_details: data.note || null, // Chi tiết thuốc
      },
      { transaction: t }
    );

    // 4. Kiểm tra và thêm thuốc vào đơn
    let totalAmount = 0;
    const prescriptionMedicines = [];

    for (const med of data.medicines) {
      const medicine = await db.Medicine.findByPk(med.medicine_id);
      if (!medicine) {
        throw new NotFoundError(
          `Không tìm thấy thuốc với ID ${med.medicine_id}`
        );
      }

      // Kiểm tra số lượng thuốc trong kho
      if (med.quantity > medicine.quantity) {
        throw new BadRequestError(
          `Thuốc ${medicine.name} không đủ số lượng trong kho. Hiện chỉ còn ${medicine.quantity} ${medicine.unit}`
        );
      }

      // Tính tiền thuốc
      const itemTotal = med.quantity * medicine.price;
      totalAmount += itemTotal;

      // Thêm vào danh sách thuốc
      prescriptionMedicines.push({
        retail_prescription_id: retail_prescription_id.retail_prescription_id,
        medicine_id: med.medicine_id,
        quantity: med.quantity,
        actual_quantity: med.quantity,
        unit_price: medicine.price,
        total_price: itemTotal,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
      });
    }

    // 5. Tạo chi tiết đơn thuốc
    await db.RetailPrescriptionMedicine.bulkCreate(prescriptionMedicines, {
      transaction: t,
    });

    // 6. Tạo bản ghi thanh toán
    const prescriptionPayment = await db.RetailPrescriptionPayment.create(
      {
        retail_prescription_id: retail_prescription_id.retail_prescription_id,
        amount: totalAmount,
        status: "pending", // Thanh toán chờ
        payment_method: null, // Chưa chọn phương thức thanh toán
        created_by: pharmacist.pharmacist_id, // Dược sĩ tạo đơn thanh toán
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit(); // Commit transaction sau khi thành công

    // 7. Trả về kết quả
    return {
      success: true,
      message: "Tạo đơn thuốc bán lẻ thành công",
      data: {
        retail_prescription_id: retail_prescription_id.retail_prescription_id,
        created_at: dayjs(retail_prescription_id.created_at)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD HH:mm:ss"),
        status: retail_prescription_id.status,
        note: retail_prescription_id.medicine_details,
        patient: {
          patient_id: patient.patient_id,
          name: patient.user.username,
          email: patient.user.email,
        },
        pharmacist: {
          pharmacist_id: pharmacist.pharmacist_id,
          name: pharmacist.user.username,
        },
        medicines: prescriptionMedicines.map((item) => ({
          medicine_id: item.medicine_id,
          quantity: item.quantity,
          unit_price: `${parseInt(item.unit_price).toLocaleString(
            "vi-VN"
          )} VNĐ`,
          total_price: `${parseInt(item.total_price).toLocaleString(
            "vi-VN"
          )} VNĐ`,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
        })),
        payment: {
          prescription_payment_id:
            prescriptionPayment.retail_prescription_payment_id,
          amount: `${parseInt(totalAmount).toLocaleString("vi-VN")} VNĐ`,
          status: prescriptionPayment.status,
        },
      },
    };
  } catch (error) {
    await t.rollback(); // Nếu có lỗi, rollback transaction
    throw error;
  }
};

/**
 * Lấy danh sách đơn thuốc bán lẻ
 * @param {Object} params - Các tham số lọc và phân trang
 * @param {string} params.status - Trạng thái đơn thuốc (pending_prepare, waiting_payment, completed, cancelled)
 * @param {string} params.start_date - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} params.end_date - Ngày kết thúc (YYYY-MM-DD)
 * @param {number} params.page - Trang hiện tại
 * @param {number} params.limit - Số bản ghi trên mỗi trang
 * @returns {Promise<Object>} Danh sách đơn thuốc bán lẻ và thông tin phân trang
 */
export const getAllRetailPrescriptions = async ({
  status,
  start_date,
  end_date,
  page = 1,
  limit = 10,
}) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  // Lọc theo trạng thái
  if (status) {
    // Nếu status là 'pending', tìm cả 'pending_prepare'
    if (status === "pending") {
      whereClause.status = "pending_prepare";
    } else {
      whereClause.status = status;
    }
  }

  // Lọc theo thời gian
  if (start_date || end_date) {
    whereClause.created_at = {};
    if (start_date) {
      whereClause.created_at[Op.gte] = dayjs
        .tz(start_date, "Asia/Ho_Chi_Minh")
        .startOf("day")
        .toDate();
    }
    if (end_date) {
      whereClause.created_at[Op.lte] = dayjs
        .tz(end_date, "Asia/Ho_Chi_Minh")
        .endOf("day")
        .toDate();
    }
  }

  console.log("Search conditions:", whereClause);

  // Thực hiện truy vấn
  const { count, rows } = await db.RetailPrescription.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: db.Patient,
        as: "patient",
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["username", "email"],
          },
        ],
      },
      {
        model: db.Pharmacist,
        as: "pharmacist",
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["username"],
          },
        ],
      },
      {
        model: db.RetailPrescriptionMedicine,
        as: "retailPrescriptionMedicines",
        include: [
          {
            model: db.Medicine,
            as: "medicine",
            attributes: ["medicine_id", "name", "unit", "price"],
          },
        ],
      },
      {
        model: db.RetailPrescriptionPayment,
        as: "retailPrescriptionPayments",
        attributes: [
          "retail_prescription_payment_id",
          "amount",
          "status",
          "payment_method",
          "payment_date",
        ],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  console.log("Found prescriptions:", count);

  // Format dữ liệu trả về
  const prescriptions = rows.map((prescription) => ({
    retail_prescription_id: prescription.retail_prescription_id,
    created_at: dayjs(prescription.created_at)
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DD HH:mm:ss"),
    status: prescription.status,
    status_info: {
      confirmed_at: prescription.confirmed_at
        ? dayjs(prescription.confirmed_at)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD HH:mm:ss")
        : null,
      completed_at: prescription.completed_at
        ? dayjs(prescription.completed_at)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD HH:mm:ss")
        : null,
      cancelled_at: prescription.cancelled_at
        ? dayjs(prescription.cancelled_at)
            .tz("Asia/Ho_Chi_Minh")
            .format("YYYY-MM-DD HH:mm:ss")
        : null,
      cancelled_reason: prescription.cancelled_reason,
    },
    patient: prescription.patient?.user
      ? {
          patient_id: prescription.patient.patient_id,
          name: prescription.patient.user.username,
          email: prescription.patient.user.email,
        }
      : null,
    pharmacist: prescription.pharmacist?.user
      ? {
          pharmacist_id: prescription.pharmacist.pharmacist_id,
          name: prescription.pharmacist.user.username,
        }
      : null,
    medicines:
      prescription.retailPrescriptionMedicines?.map((item) => ({
        medicine_id: item.medicine_id,
        name: item.medicine?.name,
        quantity: item.quantity,
        actual_quantity: item.actual_quantity,
        unit: item.medicine?.unit,
        unit_price: item.unit_price
          ? `${parseInt(item.unit_price).toLocaleString("vi-VN")} VNĐ`
          : "0 VNĐ",
        total_price: item.total_price
          ? `${parseInt(item.total_price).toLocaleString("vi-VN")} VNĐ`
          : "0 VNĐ",
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
      })) || [],
    payment: prescription.retailPrescriptionPayments?.[0]
      ? {
          payment_id:
            prescription.retailPrescriptionPayments[0]
              .retail_prescription_payment_id,
          amount: prescription.retailPrescriptionPayments[0].amount
            ? `${parseInt(
                prescription.retailPrescriptionPayments[0].amount
              ).toLocaleString("vi-VN")} VNĐ`
            : "0 VNĐ",
          status: prescription.retailPrescriptionPayments[0].status,
          payment_method:
            prescription.retailPrescriptionPayments[0].payment_method,
          payment_date: prescription.retailPrescriptionPayments[0].payment_date
            ? dayjs(prescription.retailPrescriptionPayments[0].payment_date)
                .tz("Asia/Ho_Chi_Minh")
                .format("YYYY-MM-DD HH:mm:ss")
            : null,
        }
      : null,
  }));

  return {
    success: true,
    message:
      prescriptions.length > 0
        ? "Lấy danh sách đơn thuốc bán lẻ thành công"
        : "Không tìm thấy đơn thuốc bán lẻ nào",
    data: {
      prescriptions,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_records: count,
        per_page: limit,
      },
    },
  };
};

/**
 * Lấy chi tiết đơn thuốc bán lẻ
 * @param {number} retail_prescription_id - ID của đơn thuốc bán lẻ
 * @returns {Promise<Object>} Thông tin chi tiết đơn thuốc bán lẻ
 */
export const getRetailPrescriptionDetails = async (retail_prescription_id) => {
  // Kiểm tra đơn thuốc tồn tại
  const prescription = await db.RetailPrescription.findByPk(
    retail_prescription_id,
    {
      include: [
        {
          model: db.Patient,
          as: "patient",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["username", "email"],
            },
          ],
        },
        {
          model: db.Pharmacist,
          as: "pharmacist",
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["username"],
            },
          ],
        },
        {
          model: db.RetailPrescriptionMedicine,
          as: "retailPrescriptionMedicines",
          include: [
            {
              model: db.Medicine,
              as: "medicine",
              attributes: [
                "medicine_id",
                "name",
                "unit",
                "price",
                "quantity",
                // "is_out_of_stock",
              ],
            },
          ],
        },
        {
          model: db.RetailPrescriptionPayment,
          as: "retailPrescriptionPayments",
          attributes: [
            "retail_prescription_payment_id",
            "amount",
            "status",
            "payment_method",
            "payment_date",
            "note",
          ],
        },
      ],
    }
  );

  if (!prescription) {
    throw new NotFoundError("Không tìm thấy đơn thuốc bán lẻ");
  }

  // Format dữ liệu trả về
  return {
    success: true,
    message: "Lấy thông tin đơn thuốc bán lẻ thành công",
    data: {
      prescription_id: prescription.retail_prescription_id,
      created_at: dayjs(prescription.created_at)
        .tz("Asia/Ho_Chi_Minh")
        .format("YYYY-MM-DD HH:mm:ss"),
      status: prescription.status,
      status_info: {
        confirmed_at: prescription.confirmed_at
          ? dayjs(prescription.confirmed_at)
              .tz("Asia/Ho_Chi_Minh")
              .format("YYYY-MM-DD HH:mm:ss")
          : null,
        completed_at: prescription.completed_at
          ? dayjs(prescription.completed_at)
              .tz("Asia/Ho_Chi_Minh")
              .format("YYYY-MM-DD HH:mm:ss")
          : null,
        cancelled_at: prescription.cancelled_at
          ? dayjs(prescription.cancelled_at)
              .tz("Asia/Ho_Chi_Minh")
              .format("YYYY-MM-DD HH:mm:ss")
          : null,
        cancelled_reason: prescription.cancelled_reason,
      },
      medicine_details: prescription.medicine_details,
      patient: prescription.patient?.user
        ? {
            patient_id: prescription.patient.patient_id,
            name: prescription.patient.user.username,
            email: prescription.patient.user.email,
          }
        : null,
      pharmacist: prescription.pharmacist?.user
        ? {
            pharmacist_id: prescription.pharmacist.pharmacist_id,
            name: prescription.pharmacist.user.username,
          }
        : null,
      medicines:
        prescription.retailPrescriptionMedicines?.map((item) => ({
          medicine_id: item.medicine_id,
          name: item.medicine?.name,
          quantity: item.quantity,
          actual_quantity: item.actual_quantity,
          unit: item.medicine?.unit,
          unit_price: item.unit_price
            ? `${parseInt(item.unit_price).toLocaleString("vi-VN")} VNĐ`
            : "0 VNĐ",
          total_price: item.total_price
            ? `${parseInt(item.total_price).toLocaleString("vi-VN")} VNĐ`
            : "0 VNĐ",
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
        })) || [],
      payment: prescription.retailPrescriptionPayments?.[0]
        ? {
            payment_id:
              prescription.retailPrescriptionPayments[0]
                .retail_prescription_payment_id,
            amount: prescription.retailPrescriptionPayments[0].amount
              ? `${parseInt(
                  prescription.retailPrescriptionPayments[0].amount
                ).toLocaleString("vi-VN")} VNĐ`
              : "0 VNĐ",
            status: prescription.retailPrescriptionPayments[0].status,
            payment_method:
              prescription.retailPrescriptionPayments[0].payment_method,
            payment_date: prescription.retailPrescriptionPayments[0]
              .payment_date
              ? dayjs(prescription.retailPrescriptionPayments[0].payment_date)
                  .tz("Asia/Ho_Chi_Minh")
                  .format("YYYY-MM-DD HH:mm:ss")
              : null,
            note: prescription.retailPrescriptionPayments[0].note,
          }
        : null,
    },
  };
};

/**
 * Cập nhật đơn thuốc bán lẻ
 * @param {number} retail_prescription_id - ID của đơn thuốc bán lẻ
 * @param {Object} data - Dữ liệu cập nhật
 * @param {string} data.note - Ghi chú về đơn thuốc
 * @param {Array} data.medicines - Danh sách thuốc đã cập nhật
 * @param {number} pharmacist_id - ID của dược sĩ thực hiện cập nhật
 * @returns {Promise<Object>} Thông tin đơn thuốc đã cập nhật
 */
export const updateRetailPrescription = async (
  retail_prescription_id,
  data,
  pharmacist_id
) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id: pharmacist_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
    });

    if (!pharmacist) {
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    // 2. Kiểm tra đơn thuốc tồn tại
    const prescription = await db.RetailPrescription.findByPk(
      retail_prescription_id,
      {
        include: [
          {
            model: db.RetailPrescriptionPayment,
            as: "retailPrescriptionPayments",
          },
        ],
        transaction: t,
      }
    );

    if (!prescription) {
      throw new NotFoundError("Không tìm thấy đơn thuốc bán lẻ");
    }

    // 3. Kiểm tra trạng thái đơn thuốc
    if (prescription.status === "completed") {
      throw new BadRequestError("Không thể cập nhật đơn thuốc đã hoàn thành");
    }

    if (prescription.status === "cancelled") {
      throw new BadRequestError("Không thể cập nhật đơn thuốc đã bị hủy");
    }

    // 4. Kiểm tra thanh toán
    const payment = prescription.retailPrescriptionPayments?.[0];
    if (payment && payment.status === "paid") {
      throw new BadRequestError("Không thể cập nhật đơn thuốc đã thanh toán");
    }

    // 5. Cập nhật ghi chú đơn thuốc nếu có
    if (data.note !== undefined) {
      await prescription.update(
        {
          medicine_details: data.note,
        },
        { transaction: t }
      );
    }

    // 6. Cập nhật danh sách thuốc nếu có
    if (data.medicines && data.medicines.length > 0) {
      // Xóa danh sách thuốc cũ
      await db.RetailPrescriptionMedicine.destroy({
        where: { retail_prescription_id },
        transaction: t,
      });

      // Tính tổng tiền mới
      let totalAmount = 0;
      const prescriptionMedicines = [];

      for (const med of data.medicines) {
        const medicine = await db.Medicine.findByPk(med.medicine_id, {
          transaction: t,
        });
        if (!medicine) {
          throw new NotFoundError(
            `Không tìm thấy thuốc với ID ${med.medicine_id}`
          );
        }

        // Kiểm tra số lượng thuốc trong kho
        if (med.quantity > medicine.quantity) {
          throw new BadRequestError(
            `Thuốc ${medicine.name} không đủ số lượng trong kho. Hiện chỉ còn ${medicine.quantity} ${medicine.unit}`
          );
        }

        // Tính tiền thuốc
        const itemTotal = med.quantity * medicine.price;
        totalAmount += itemTotal;

        // Thêm vào danh sách thuốc
        prescriptionMedicines.push({
          retail_prescription_id,
          medicine_id: med.medicine_id,
          quantity: med.quantity,
          actual_quantity: med.quantity,
          unit_price: medicine.price,
          total_price: itemTotal,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
        });
      }

      // Tạo chi tiết đơn thuốc mới
      await db.RetailPrescriptionMedicine.bulkCreate(prescriptionMedicines, {
        transaction: t,
      });

      // Cập nhật hoặc tạo bản ghi thanh toán
      if (payment) {
        await payment.update(
          {
            amount: totalAmount,
            updated_by: pharmacist.pharmacist_id,
            updated_at: new Date(),
          },
          { transaction: t }
        );
      } else {
        await db.RetailPrescriptionPayment.create(
          {
            retail_prescription_id,
            amount: totalAmount,
            status: "pending", // Thanh toán chờ
            payment_method: null, // Chưa chọn phương thức thanh toán
            created_by: pharmacist.pharmacist_id, // Dược sĩ tạo đơn thanh toán
            created_at: new Date(),
            updated_at: new Date(),
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    // 7. Lấy thông tin đơn thuốc đã cập nhật
    const updatedPrescription = await getRetailPrescriptionDetails(
      retail_prescription_id
    );

    return {
      success: true,
      message: "Cập nhật đơn thuốc bán lẻ thành công",
      data: updatedPrescription.data,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Cập nhật trạng thái đơn thuốc bán lẻ
 * @param {number} retail_prescription_id - ID của đơn thuốc bán lẻ
 * @param {string} status - Trạng thái mới (pending_prepare, waiting_payment, completed, cancelled)
 * @param {number} pharmacist_id - ID của dược sĩ thực hiện cập nhật
 * @returns {Promise<Object>} Thông tin đơn thuốc đã cập nhật
 */
export const updateRetailPrescriptionStatus = async (
  retail_prescription_id,
  status,
  pharmacist_id
) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id: pharmacist_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
    });

    if (!pharmacist) {
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    // 2. Kiểm tra đơn thuốc tồn tại
    const prescription = await db.RetailPrescription.findByPk(
      retail_prescription_id,
      {
        include: [
          {
            model: db.RetailPrescriptionPayment,
            as: "retailPrescriptionPayments",
          },
        ],
        transaction: t,
      }
    );

    if (!prescription) {
      throw new NotFoundError("Không tìm thấy đơn thuốc bán lẻ");
    }

    // 3. Kiểm tra trạng thái hợp lệ
    const validStatuses = [
      "pending_prepare",
      "waiting_payment",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError("Trạng thái không hợp lệ");
    }

    // 4. Kiểm tra điều kiện chuyển trạng thái
    if (status === "completed") {
      // Kiểm tra thanh toán
      const payment = prescription.retailPrescriptionPayments?.[0];
      if (!payment || payment.status !== "paid") {
        throw new BadRequestError(
          "Không thể hoàn thành đơn thuốc chưa thanh toán"
        );
      }
    }

    if (status === "cancelled") {
      // Kiểm tra đơn thuốc chưa hoàn thành
      if (prescription.status === "completed") {
        throw new BadRequestError("Không thể hủy đơn thuốc đã hoàn thành");
      }
    }

    // Kiểm tra nếu đơn thuốc đã thanh toán thì không thể quay về trạng thái pending_prepare hoặc waiting_payment
    const payment = prescription.retailPrescriptionPayments?.[0];
    if (
      payment &&
      payment.status === "paid" &&
      (status === "pending_prepare" || status === "waiting_payment")
    ) {
      throw new BadRequestError(
        "Không thể chuyển đơn thuốc đã thanh toán về trạng thái chờ"
      );
    }

    // 5. Cập nhật trạng thái
    const updateData = {
      status,
      pharmacist_id: pharmacist.pharmacist_id,
    };

    // Thêm thời gian tương ứng với trạng thái
    if (status === "waiting_payment") {
      updateData.confirmed_at = new Date();
    } else if (status === "completed") {
      updateData.completed_at = new Date();
    } else if (status === "cancelled") {
      updateData.cancelled_at = new Date();
    }

    await prescription.update(updateData, { transaction: t });

    await t.commit();

    // 6. Lấy thông tin đơn thuốc đã cập nhật
    const updatedPrescription = await getRetailPrescriptionDetails(
      retail_prescription_id
    );

    return {
      success: true,
      message: "Cập nhật trạng thái đơn thuốc bán lẻ thành công",
      data: updatedPrescription.data,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Cập nhật trạng thái thanh toán đơn thuốc bán lẻ
 * @param {number} payment_id - ID của thanh toán đơn thuốc bán lẻ
 * @param {string} payment_method - Phương thức thanh toán (cash, zalopay)
 * @param {number} pharmacist_id - ID của dược sĩ thực hiện cập nhật
 * @param {string} note - Ghi chú (nếu có)
 * @returns {Promise<Object>} - Thông tin thanh toán đã cập nhật
 */
export const updateRetailPrescriptionPaymentStatus = async (
  payment_id,
  payment_method,
  pharmacist_id,
  note = ""
) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id: pharmacist_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
    });

    if (!pharmacist) {
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    // 2. Kiểm tra thanh toán tồn tại
    const retailPrescriptionPayment =
      await db.RetailPrescriptionPayment.findOne({
        where: { retail_prescription_payment_id: payment_id },
        include: [
          {
            model: db.RetailPrescription,
            as: "retailPrescription",
            include: [
              {
                model: db.Patient,
                as: "patient",
                include: [
                  {
                    model: db.User,
                    as: "user",
                    attributes: ["username", "email"],
                  },
                ],
              },
            ],
          },
        ],
        transaction: t,
      });

    if (!retailPrescriptionPayment) {
      throw new NotFoundError("Không tìm thấy thanh toán đơn thuốc bán lẻ");
    }

    // 3. Kiểm tra trạng thái hiện tại
    if (retailPrescriptionPayment.status === "paid") {
      throw new BadRequestError("Đơn thuốc đã được thanh toán trước đó");
    }

    if (retailPrescriptionPayment.status === "cancelled") {
      throw new BadRequestError("Đơn thuốc đã bị hủy");
    }

    // 4. Kiểm tra phương thức thanh toán hợp lệ
    const validPaymentMethods = ["cash", "zalopay"];
    if (!validPaymentMethods.includes(payment_method)) {
      throw new BadRequestError("Phương thức thanh toán không hợp lệ");
    }

    let status = "pending";
    let paymentDate = null;

    // 5. Xử lý theo phương thức thanh toán
    switch (payment_method) {
      case "cash":
        // Thanh toán tiền mặt -> tự động chuyển trạng thái thành paid
        status = "paid";
        paymentDate = new Date();
        break;

      case "zalopay":
        // TODO: Tích hợp ZaloPay trong tương lai
        // Hiện tại throw error vì chưa hỗ trợ
        throw new BadRequestError(
          "Phương thức thanh toán ZaloPay chưa được hỗ trợ"
        );
        break;
    }

    // 6. Cập nhật thanh toán
    await retailPrescriptionPayment.update(
      {
        status,
        payment_method,
        note: note || retailPrescriptionPayment.note,
        payment_date: paymentDate,
        updated_by: pharmacist.pharmacist_id,
      },
      { transaction: t }
    );

    // 7. Nếu thanh toán thành công, cập nhật trạng thái đơn thuốc
    if (status === "paid") {
      await retailPrescriptionPayment.retailPrescription.update(
        {
          status: "completed",
          completed_at: new Date(),
          pharmacist_id: pharmacist.pharmacist_id,
        },
        { transaction: t }
      );
    }

    await t.commit();

    // 8. Trả về kết quả
    return {
      success: true,
      message: "Cập nhật trạng thái thanh toán đơn thuốc bán lẻ thành công",
      data: {
        retail_prescription_payment_id:
          retailPrescriptionPayment.retail_prescription_payment_id,
        retail_prescription_id:
          retailPrescriptionPayment.retail_prescription_id,
        amount: `${parseInt(retailPrescriptionPayment.amount).toLocaleString(
          "vi-VN"
        )} VNĐ`,
        status: retailPrescriptionPayment.status,
        payment_method: retailPrescriptionPayment.payment_method,
        payment_date: retailPrescriptionPayment.payment_date
          ? dayjs(retailPrescriptionPayment.payment_date)
              .tz("Asia/Ho_Chi_Minh")
              .format("YYYY-MM-DD HH:mm:ss")
          : null,
        note: retailPrescriptionPayment.note,
        patient: {
          name: retailPrescriptionPayment.retailPrescription.patient.user
            .username,
          email:
            retailPrescriptionPayment.retailPrescription.patient.user.email,
        },
        pharmacist: {
          pharmacist_id: pharmacist.pharmacist_id,
          name: pharmacist.user.username,
        },
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const completeRetailPrescription = async (
  retail_prescription_id,
  pharmacist_id
) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id: pharmacist_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
    });

    if (!pharmacist) {
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    // 2. Kiểm tra đơn thuốc tồn tại
    const prescription = await db.RetailPrescription.findByPk(
      retail_prescription_id,
      {
        include: [
          {
            model: db.RetailPrescriptionPayment,
            as: "retailPrescriptionPayments",
          },
          {
            model: db.RetailPrescriptionMedicine,
            as: "retailPrescriptionMedicines",
            include: [
              {
                model: db.Medicine,
                as: "medicine",
              },
            ],
          },
        ],
        transaction: t,
      }
    );

    if (!prescription) {
      throw new NotFoundError("Không tìm thấy đơn thuốc bán lẻ");
    }

    // 3. Kiểm tra trạng thái đơn thuốc
    if (prescription.status !== "waiting_payment") {
      throw new BadRequestError(
        "Chỉ có thể hoàn tất đơn thuốc ở trạng thái chờ thanh toán"
      );
    }

    // 4. Kiểm tra thanh toán
    const payment = prescription.retailPrescriptionPayments?.[0];
    if (!payment || payment.status !== "paid") {
      throw new BadRequestError("Không thể hoàn tất đơn thuốc chưa thanh toán");
    }

    // 5. Kiểm tra và cập nhật số lượng tồn kho
    if (
      !prescription.retailPrescriptionMedicines ||
      prescription.retailPrescriptionMedicines.length === 0
    ) {
      throw new BadRequestError("Đơn thuốc không có thuốc để xác nhận");
    }

    for (const item of prescription.retailPrescriptionMedicines) {
      if (!item.actual_quantity && item.actual_quantity !== 0) {
        throw new BadRequestError(
          `Chưa nhập số lượng thực tế cho thuốc ${item.medicine.name}`
        );
      }

      // Kiểm tra số lượng tồn kho
      if (item.actual_quantity > item.medicine.quantity) {
        throw new BadRequestError(
          `Thuốc ${item.medicine.name} không đủ số lượng trong kho. Hiện chỉ còn ${item.medicine.quantity} ${item.medicine.unit}`
        );
      }

      // Cập nhật số lượng tồn kho
      await item.medicine.update(
        {
          quantity: item.medicine.quantity - item.actual_quantity,
          // is_out_of_stock: item.medicine.quantity - item.actual_quantity === 0,
        },
        { transaction: t }
      );
    }

    // 6. Cập nhật trạng thái đơn thuốc
    await prescription.update(
      {
        status: "completed",
        pharmacist_id: pharmacist.pharmacist_id,
        completed_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    // 7. Lấy thông tin đơn thuốc đã cập nhật
    const updatedPrescription = await getRetailPrescriptionDetails(
      retail_prescription_id
    );

    return {
      success: true,
      message: "Hoàn tất đơn thuốc bán lẻ thành công",
      data: updatedPrescription.data,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Lấy danh sách thanh toán đơn thuốc bán lẻ
 * @param {Object} params - Các tham số lọc và phân trang
 * @param {string} params.status - Trạng thái thanh toán (pending, paid, cancelled)
 * @param {string} params.start_date - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} params.end_date - Ngày kết thúc (YYYY-MM-DD)
 * @param {number} params.page - Trang hiện tại
 * @param {number} params.limit - Số bản ghi trên mỗi trang
 * @returns {Promise<Object>} Danh sách thanh toán và thông tin phân trang
 */
export const getAllRetailPrescriptionPayments = async ({
  status,
  start_date,
  end_date,
  page = 1,
  limit = 10,
}) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  // Lọc theo trạng thái
  if (status) {
    whereClause.status = status;
  }

  // Lọc theo thời gian
  if (start_date || end_date) {
    whereClause.created_at = {};
    if (start_date) {
      whereClause.created_at[Op.gte] = dayjs
        .tz(start_date, "Asia/Ho_Chi_Minh")
        .startOf("day")
        .toDate();
    }
    if (end_date) {
      whereClause.created_at[Op.lte] = dayjs
        .tz(end_date, "Asia/Ho_Chi_Minh")
        .endOf("day")
        .toDate();
    }
  }

  // Thực hiện truy vấn
  const { count, rows } = await db.RetailPrescriptionPayment.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: db.RetailPrescription,
        as: "retailPrescription",
        required: true,
        include: [
          {
            model: db.Patient,
            as: "patient",
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["username", "email"],
              },
            ],
          },
          {
            model: db.Pharmacist,
            as: "pharmacist",
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["username"],
              },
            ],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  // Format dữ liệu trả về
  const payments = rows.map((payment) => ({
    payment_id: payment.retail_prescription_payment_id,
    amount: payment.amount
      ? `${parseInt(payment.amount).toLocaleString("vi-VN")} VNĐ`
      : "0 VNĐ",
    status: payment.status,
    payment_method: payment.payment_method,
    payment_date: payment.payment_date
      ? dayjs(payment.payment_date)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DD HH:mm:ss")
      : null,
    note: payment.note,
    created_at: dayjs(payment.created_at)
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DD HH:mm:ss"),
    prescription: {
      retail_prescription_id: payment.retailPrescription.retail_prescription_id,
      status: payment.retailPrescription.status,
      patient: payment.retailPrescription.patient?.user
        ? {
            patient_id: payment.retailPrescription.patient.patient_id,
            name: payment.retailPrescription.patient.user.username,
            email: payment.retailPrescription.patient.user.email,
          }
        : null,
      pharmacist: payment.retailPrescription.pharmacist?.user
        ? {
            pharmacist_id: payment.retailPrescription.pharmacist.pharmacist_id,
            name: payment.retailPrescription.pharmacist.user.username,
          }
        : null,
    },
  }));

  return {
    success: true,
    message:
      payments.length > 0
        ? "Lấy danh sách thanh toán đơn thuốc bán lẻ thành công"
        : "Không tìm thấy thanh toán đơn thuốc bán lẻ nào",
    data: {
      payments,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_records: count,
        per_page: limit,
      },
    },
  };
};

/**
 * Hủy đơn thuốc bán lẻ
 * @param {number} retail_prescription_id - ID của đơn thuốc bán lẻ
 * @param {string} reason - Lý do hủy đơn
 * @param {number} pharmacist_id - ID của dược sĩ thực hiện hủy
 * @returns {Promise<Object>} - Thông tin đơn thuốc đã hủy
 */
export const cancelRetailPrescription = async (
  retail_prescription_id,
  reason,
  pharmacist_id
) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id: pharmacist_id },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["username"],
        },
      ],
    });

    if (!pharmacist) {
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    // 2. Kiểm tra đơn thuốc tồn tại
    const prescription = await db.RetailPrescription.findByPk(
      retail_prescription_id,
      {
        include: [
          {
            model: db.Patient,
            as: "patient",
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["username", "email"],
              },
            ],
          },
          {
            model: db.RetailPrescriptionPayment,
            as: "retailPrescriptionPayments",
          },
        ],
        transaction: t,
      }
    );

    if (!prescription) {
      throw new NotFoundError("Không tìm thấy đơn thuốc bán lẻ");
    }

    // 3. Kiểm tra trạng thái đơn thuốc
    if (prescription.status === "completed") {
      throw new BadRequestError("Không thể hủy đơn thuốc đã hoàn thành");
    }

    if (prescription.status === "cancelled") {
      throw new BadRequestError("Đơn thuốc đã bị hủy trước đó");
    }

    // 4. Kiểm tra thanh toán
    const payment = prescription.retailPrescriptionPayments?.[0];
    if (payment && payment.status === "paid") {
      throw new BadRequestError("Không thể hủy đơn thuốc đã thanh toán");
    }

    // 5. Cập nhật trạng thái đơn thuốc
    await prescription.update(
      {
        status: "cancelled",
        cancelled_reason: reason,
        cancelled_at: new Date(),
        pharmacist_id: pharmacist.pharmacist_id,
      },
      { transaction: t }
    );

    // 6. Nếu có payment, cập nhật trạng thái payment thành cancelled
    if (payment) {
      await payment.update(
        {
          status: "cancelled",
          updated_by: pharmacist.pharmacist_id,
          note: `Đơn thuốc bị hủy: ${reason}`,
        },
        { transaction: t }
      );
    }

    await t.commit();

    // 7. Trả về kết quả
    return {
      success: true,
      message: "Hủy đơn thuốc bán lẻ thành công",
      data: {
        retail_prescription_id: prescription.retail_prescription_id,
        status: prescription.status,
        cancelled_reason: prescription.cancelled_reason,
        cancelled_at: prescription.cancelled_at,
        patient: prescription.patient?.user
          ? {
              patient_id: prescription.patient.patient_id,
              name: prescription.patient.user.username,
              email: prescription.patient.user.email,
            }
          : null,
        pharmacist: {
          pharmacist_id: pharmacist.pharmacist_id,
          name: pharmacist.user.username,
        },
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const getPrescriptionDetailsWithFIFO = async (
  prescription_id,
  fifo = true
) => {
  // 1. Lấy prescription & kiểm tra
  const prescription = await db.Prescription.findOne({
    where: {
      prescription_id,
      status: "pending_prepare",
      use_hospital_pharmacy: true,
    },
    include: [
      {
        model: db.Appointment,
        as: "Appointment",
        include: [
          { model: db.FamilyMember, as: "FamilyMember" },
          {
            model: db.Doctor,
            as: "Doctor",
            include: [{ model: db.User, as: "user" }],
          },
        ],
      },
      {
        model: db.PrescriptionMedicine,
        as: "prescriptionMedicines",
        include: [{ model: db.Medicine, as: "Medicine" }],
      },
    ],
  });

  if (!prescription) {
    throw new NotFoundError(
      "Không tìm thấy đơn thuốc hoặc đơn không ở trạng thái chờ chuẩn bị"
    );
  }

  // Lấy ngày hiện tại và tính ngày hết hạn tối thiểu (1 tháng từ hiện tại)
  const currentDate = new Date();
  const minExpiryDate = new Date();
  minExpiryDate.setMonth(currentDate.getMonth() + 1);

  console.log(
    "Medicine IDs in prescription:",
    prescription.prescriptionMedicines.map((pm) => pm.medicine_id)
  );

  // 2. Duyệt từng dòng thuốc
  const lines = await Promise.all(
    prescription.prescriptionMedicines.map(async (pm) => {
      const requiredQty = pm.quantity;

      console.log(
        `Processing medicine_id: ${pm.medicine_id}, quantity: ${requiredQty}`
      );

      // 2.1. Lấy tất cả lô còn hoạt động VÀ chưa hết hạn trong 1 tháng
      const batches = await db.Batch.findAll({
        where: {
          medicine_id: pm.medicine_id,
          //Tạm thời bỏ các điều kiện lọc để lấy tất cả batch
          status: "Active",
          quantity: { [Op.gt]: 0 },
          expiry_date: { [Op.gt]: minExpiryDate },
        },
        order: fifo ? [["expiry_date", "ASC"]] : null, // Sửa lỗi cú pháp order
      });

      console.log(
        `Found ${batches.length} batches for medicine_id: ${pm.medicine_id}`
      );

      // Để debug, lấy tất cả các batch bất kể điều kiện
      const allBatches = await db.Batch.findAll({
        where: {
          medicine_id: pm.medicine_id,
        },
      });

      console.log(
        `Total batches in DB for medicine_id ${pm.medicine_id}: ${allBatches.length}`
      );

      if (allBatches.length > 0 && batches.length === 0) {
        console.log(
          `All batches for medicine_id ${pm.medicine_id} failed filters:`
        );
        allBatches.forEach((b) => {
          console.log(
            `Batch ${b.batch_number}: status=${b.status}, quantity=${b.quantity}, expiry_date=${b.expiry_date}, min_expiry=${minExpiryDate}`
          );
          console.log(
            `Expiry check: ${
              new Date(b.expiry_date) > minExpiryDate ? "PASS" : "FAIL"
            }`
          );
        });
      }

      // 2.2. Tổng tồn kho
      const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);

      // 2.3. Phân bổ theo FIFO
      let remaining = requiredQty;
      let sumAllocated = 0;
      const allocations = batches.map((b) => {
        if (remaining <= 0) {
          return { batch_number: b.batch_number, allocated: 0 };
        }
        const take = Math.min(b.quantity, remaining);
        remaining -= take;
        sumAllocated += take;
        return { batch_number: b.batch_number, allocated: take };
      });

      // 2.4. Tính thiếu hụt
      const canFulfill = sumAllocated >= requiredQty;
      const shortage = canFulfill ? 0 : requiredQty - sumAllocated;

      // 2.5. Tính line total
      const unitPrice = pm.Medicine.price;
      const lineTotal = sumAllocated * unitPrice;

      return {
        medicine_id: pm.Medicine.medicine_id,
        medicine_name: pm.Medicine.name,
        quantity: requiredQty,
        unit: pm.Medicine.unit,
        unit_price: unitPrice,
        total_available: totalAvailable,
        canFulfill,
        shortage,
        batches: batches.map((b) => ({
          batch_number: b.batch_number,
          expiry_date: dayjs(b.expiry_date).format("YYYY-MM-DD"),
          quantity: b.quantity,
        })),
        allocations,
        sum_allocated: sumAllocated,
        line_total: lineTotal,
      };
    })
  );

  // 3. Tổng tiền đơn
  const totalPrice = lines.reduce((sum, l) => sum + l.line_total, 0);

  // 4. Build response
  return {
    success: true,
    data: {
      prescription_id: prescription.prescription_id,
      family_member: {
        family_member_id:
          prescription.Appointment.FamilyMember.family_member_id,
        name: prescription.Appointment.FamilyMember.username,
        dob: dayjs(prescription.Appointment.FamilyMember.date_of_birth).format(
          "YYYY-MM-DD"
        ),
        phone_number: prescription.Appointment.FamilyMember.phone_number,
      },
      appointment: {
        appointment_id: prescription.Appointment.appointment_id,
        datetime: dayjs(prescription.Appointment.appointment_datetime)
          .tz("Asia/Ho_Chi_Minh")
          .format("YYYY-MM-DDTHH:mm:ssZ"),
        doctor_name: prescription.Appointment.Doctor.user.username,
      },
      lines,
      total_price: totalPrice,
    },
  };
};

/**
 * Chuẩn bị và thanh toán đơn thuốc với phân bổ FIFO tự động
 * @param {number} prescription_id - ID của đơn thuốc
 * @param {Array} lines - Danh sách thuốc cần cấp
 * @param {string} payment_method - Phương thức thanh toán (cash/online)
 */
export const prepareAndPayPrescription = async (
  prescription_id,
  lines,
  payment_method
) => {
  const t = await db.sequelize.transaction();
  try {
    // 1. Lấy đơn thuốc chờ prepare
    const prescription = await db.Prescription.findOne({
      where: { prescription_id, status: "pending_prepare" },
      include: [
        { model: db.PrescriptionMedicine, as: "prescriptionMedicines" },
      ],
      transaction: t,
    });
    if (!prescription) {
      throw new NotFoundError("Đơn không tồn tại hoặc không chờ chuẩn bị");
    }

    const invoiceLines = [];

    // 2. Với mỗi line request
    for (const line of lines) {
      const { medicine_id, allocated, allocations } = line;

      // Kiểm tra thuốc có trong đơn không
      const pm = prescription.prescriptionMedicines.find(
        (pm) => pm.medicine_id === medicine_id
      );
      if (!pm)
        throw new BadRequestError(`Medicine ${medicine_id} không có trong đơn`);

      // Kiểm tra số lượng được cấp có vượt quá số kê không
      if (allocated > pm.quantity) {
        throw new BadRequestError(
          `Yêu cầu ${allocated} vượt quá kê ${pm.quantity}`
        );
      }

      // Nếu không có thông tin phân bổ batch cụ thể, thực hiện phân bổ tự động
      if (!allocations || allocations.length === 0) {
        // Ngày hiện tại + 1 tháng
        const currentDate = new Date();
        const minExpiryDate = new Date();
        minExpiryDate.setMonth(currentDate.getMonth() + 1);

        // 3. Lấy các batch Active có đủ hàng, theo FIFO (expiry_date ASC)
        const batches = await db.Batch.findAll({
          where: {
            medicine_id,
            status: "Active",
            quantity: { [Op.gt]: 0 },
            expiry_date: { [Op.gt]: minExpiryDate },
          },
          order: [["expiry_date", "ASC"]],
          transaction: t,
        });

        let remaining = allocated;
        const lineAllocations = [];

        // 4. Tự động phân bổ FIFO
        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(batch.quantity, remaining);
          lineAllocations.push({
            batch_number: batch.batch_number,
            allocated: take,
          });

          // Trừ tồn kho
          await batch.decrement("quantity", { by: take, transaction: t });
          remaining -= take;
        }

        if (remaining > 0) {
          throw new BadRequestError(
            `Không đủ hàng cho medicine ${medicine_id}`
          );
        }

        // 5. Cập nhật actual_quantity
        await pm.update({ actual_quantity: allocated }, { transaction: t });

        // 6. Chuẩn bị dòng hoá đơn
        const med = await db.Medicine.findByPk(medicine_id, { transaction: t });
        invoiceLines.push({
          medicine_id,
          medicine_name: med.name,
          allocated,
          unit_price: med.price,
          line_total: allocated * med.price,
          allocations: lineAllocations,
        });
      } else {
        // Sử dụng thông tin phân bổ đã được gửi lên
        let totalAllocated = 0;
        const lineAllocations = [];

        // Chỉ lấy các batch allocation có allocated > 0
        const validAllocations = allocations.filter((a) => a.allocated > 0);

        for (const allocation of validAllocations) {
          const { batch_number, allocated: batchAllocated } = allocation;

          // Tìm batch trong database
          const batch = await db.Batch.findOne({
            where: {
              medicine_id,
              batch_number,
              status: "Active",
            },
            transaction: t,
          });

          if (!batch) {
            throw new BadRequestError(
              `Không tìm thấy batch ${batch_number} cho thuốc ${medicine_id}`
            );
          }

          if (batch.quantity < batchAllocated) {
            throw new BadRequestError(
              `Batch ${batch_number} không đủ số lượng (yêu cầu: ${batchAllocated}, tồn kho: ${batch.quantity})`
            );
          }

          // Trừ tồn kho
          await batch.decrement("quantity", {
            by: batchAllocated,
            transaction: t,
          });

          // Lưu allocation cho invoice
          lineAllocations.push({ batch_number, allocated: batchAllocated });
          totalAllocated += batchAllocated;
        }

        // Kiểm tra tổng số lượng đã phân bổ
        if (totalAllocated !== allocated) {
          throw new BadRequestError(
            `Tổng số lượng phân bổ (${totalAllocated}) không khớp với số lượng cấp (${allocated})`
          );
        }

        // 5. Cập nhật actual_quantity
        await pm.update({ actual_quantity: allocated }, { transaction: t });

        // 6. Chuẩn bị dòng hoá đơn
        const med = await db.Medicine.findByPk(medicine_id, { transaction: t });
        invoiceLines.push({
          medicine_id,
          medicine_name: med.name,
          allocated,
          unit_price: med.price,
          line_total: allocated * med.price,
          allocations: lineAllocations,
        });
      }
    }

    // 7. Đánh dấu đơn completed
    await prescription.update(
      {
        status: "completed",
        completed_at: new Date(),
      },
      { transaction: t }
    );

    // 8. Tạo bản ghi payment
    const total_price = invoiceLines.reduce((sum, l) => sum + l.line_total, 0);
    const payment = await db.PrescriptionPayment.create(
      {
        prescription_id,
        amount: total_price,
        payment_method,
        status: "paid",
        payment_date: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    return {
      success: true,
      data: {
        prescription_id,
        invoice: {
          lines: invoiceLines,
          total_price,
        },
        payment: {
          prescription_payment_id: payment.prescription_payment_id,
          amount: payment.amount,
          status: payment.status,
          payment_method: payment.payment_method,
          payment_date: payment.payment_date,
        },
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Thêm lô thuốc mới cho một loại thuốc
 * @param {number} medicine_id - ID của thuốc
 * @param {Object} batchData - Dữ liệu của lô thuốc
 * @param {string} batchData.batch_number - Số lô thuốc
 * @param {number} batchData.quantity - Số lượng thuốc trong lô
 * @param {string} batchData.import_date - Ngày nhập thuốc (YYYY-MM-DD)
 * @param {string} batchData.expiry_date - Ngày hết hạn (YYYY-MM-DD)
 * @param {string} batchData.status - Trạng thái lô (Active, Expired, Disposed)
 * @returns {Promise<Object>} - Thông tin lô thuốc đã tạo
 */
export const addMedicineBatch = async (medicine_id, batchData) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra thuốc tồn tại
    const medicine = await db.Medicine.findByPk(medicine_id, {
      transaction: t,
    });
    if (!medicine) {
      throw new NotFoundError(`Không tìm thấy thuốc với ID ${medicine_id}`);
    }

    // 2. Kiểm tra batch_number đã tồn tại chưa
    const existingBatch = await db.Batch.findOne({
      where: { batch_number: batchData.batch_number },
      transaction: t,
    });

    if (existingBatch) {
      throw new BadRequestError(`Số lô ${batchData.batch_number} đã tồn tại`);
    }

    // 3. Validate dữ liệu
    if (!batchData.batch_number) {
      throw new BadRequestError("Số lô không được để trống");
    }

    if (!batchData.quantity || batchData.quantity <= 0) {
      throw new BadRequestError("Số lượng thuốc phải lớn hơn 0");
    }

    if (!batchData.import_date) {
      throw new BadRequestError("Ngày nhập không được để trống");
    }

    if (!batchData.expiry_date) {
      throw new BadRequestError("Ngày hết hạn không được để trống");
    }

    // Kiểm tra ngày hết hạn phải sau ngày nhập
    const importDate = new Date(batchData.import_date);
    const expiryDate = new Date(batchData.expiry_date);

    if (expiryDate <= importDate) {
      throw new BadRequestError("Ngày hết hạn phải sau ngày nhập");
    }

    // 4. Tạo batch mới - không truyền created_at và updated_at để cơ sở dữ liệu tự xử lý
    // Sử dụng SQL thuần để tạo batch mới và tránh lỗi sequelize.literal
    const createBatchQuery = `
      INSERT INTO Batches 
      (medicine_id, batch_number, quantity, import_date, expiry_date, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result, metadata] = await db.sequelize.query(createBatchQuery, {
      replacements: [
        medicine_id,
        batchData.batch_number,
        batchData.quantity,
        batchData.import_date,
        batchData.expiry_date,
        batchData.status || "Active",
      ],
      type: db.sequelize.QueryTypes.INSERT,
      transaction: t,
    });

    const batchId = result; // ID của batch mới được tạo

    // 5. Cập nhật tổng số lượng thuốc
    // await medicine.increment("quantity", {
    //   by: batchData.quantity,
    //   transaction: t,
    // });

    // 6. Lấy thông tin batch mới tạo để trả về
    const newBatch = await db.Batch.findByPk(batchId, { transaction: t });

    await t.commit();

    // 7. Trả về thông tin batch đã tạo
    return {
      success: true,
      message: "Thêm lô thuốc thành công",
      data: {
        batch_id: newBatch.batch_id,
        batch_number: newBatch.batch_number,
        medicine_id: newBatch.medicine_id,
        medicine_name: medicine.name,
        quantity: newBatch.quantity,
        import_date: dayjs(newBatch.import_date).format("YYYY-MM-DD"),
        expiry_date: dayjs(newBatch.expiry_date).format("YYYY-MM-DD"),
        status: newBatch.status,
        created_at: dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss"),
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};
