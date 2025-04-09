import bcrypt from "bcryptjs";
import BadRequestError from "../errors/bad_request.js";
import db from "../models/index.js";
import jwt from "jsonwebtoken";
import NotFoundError from "../errors/not_found.js";
import { Op } from "sequelize";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

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
          "instructions"
        ],
        include: [
          {
            model: db.Medicine,
            as: "medicine",
            attributes: [
              "medicine_id",
              "name",
              "price",
              "unit",
              "expiry_date",
              "is_out_of_stock",
              "quantity"
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
      {
        model: db.PrescriptionPayment,
        as: "prescriptionPayments",
        attributes: ["prescription_payment_id", "amount", "status", "payment_method"]
      }
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
      created_at: dayjs(prescription.createdAt).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
      appointment: {
        appointment_id: prescription.Appointment.appointment_id,
        datetime: dayjs(prescription.Appointment.appointment_datetime)
          .tz('Asia/Ho_Chi_Minh')
          .format('YYYY-MM-DD HH:mm:ss'),
        status: prescription.Appointment.status,
        patient: {
          name: prescription.Appointment.Patient.user.username,
          email: prescription.Appointment.Patient.user.email
        },
        doctor: {
          name: prescription.Appointment.Doctor.user.username,
          email: prescription.Appointment.Doctor.user.email
        }
      },
      medicines: prescription.prescriptionMedicines.map(item => ({
        prescription_medicine_id: item.prescription_medicine_id,
        medicine: {
          medicine_id: item.medicine.medicine_id,
          name: item.medicine.name,
          unit: item.medicine.unit,
          price: item.medicine.price ? `${item.medicine.price.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ',
          stock_quantity: item.medicine.quantity,
          expiry_date: item.medicine.expiry_date ? 
            dayjs(item.medicine.expiry_date).format('YYYY-MM-DD') : null,
          status: item.medicine.is_out_of_stock ? 'Tạm hết hàng' : 'Còn hàng'
        },
        prescribed: {
          quantity: item.quantity || 0,
          dosage: item.dosage || 'Chưa có thông tin',
          frequency: item.frequency || 'Chưa có thông tin',
          duration: item.duration || 'Chưa có thông tin',
          instructions: item.instructions || 'Chưa có hướng dẫn'
        },
        dispensed: {
          quantity: item.actual_quantity || null
        }
      })),
      payment: prescription.prescriptionPayments ? {
        payment_id: prescription.prescriptionPayments.prescription_payment_id,
        amount: prescription.prescriptionPayments.amount ? 
          `${prescription.prescriptionPayments.amount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ',
        status: prescription.prescriptionPayments.status,
        payment_method: prescription.prescriptionPayments.payment_method
      } : null
    }
  };
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
        as: "medicine"
      }
    ]
  });

  if (!prescriptionMedicine) {
    throw new NotFoundError("Không tìm thấy thuốc trong đơn");
  }

  // Kiểm tra số lượng thực tế
  if (isNaN(actual_quantity) || !Number.isInteger(actual_quantity) || actual_quantity < 0) {
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
          unit: prescriptionMedicine.medicine.unit
        }
      }
    };
  }

  // Nếu không thay đổi thuốc
  if (original_medicine_id === new_medicine_id) {
    // Kiểm tra số lượng tồn kho
    if (actual_quantity > prescriptionMedicine.medicine.quantity) {
      throw new BadRequestError(
        `Thuốc ${prescriptionMedicine.medicine.name} không đủ số lượng trong kho. Hiện chỉ còn ${prescriptionMedicine.medicine.quantity} ${prescriptionMedicine.medicine.unit}`
      );
    }

    // Cập nhật thông tin thuốc
    const updateData = {
      quantity: actual_quantity,
      total_price: prescriptionMedicine.medicine.price * actual_quantity,
      dosage: dosage || prescriptionMedicine.dosage,
      frequency: frequency || prescriptionMedicine.frequency,
      duration: duration || prescriptionMedicine.duration,
      instructions: instructions || prescriptionMedicine.instructions
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
          price: prescriptionMedicine.medicine.price ? 
            `${prescriptionMedicine.medicine.price.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'
        },
        quantity: actual_quantity,
        total_price: prescriptionMedicine.medicine.price * actual_quantity ? 
          `${(prescriptionMedicine.medicine.price * actual_quantity).toLocaleString('vi-VN')} VNĐ` : '0 VNĐ',
        prescribed: {
          dosage: dosage || prescriptionMedicine.dosage || 'Chưa có thông tin',
          frequency: frequency || prescriptionMedicine.frequency || 'Chưa có thông tin',
          duration: duration || prescriptionMedicine.duration || 'Chưa có thông tin',
          instructions: instructions || prescriptionMedicine.instructions || 'Chưa có hướng dẫn'
        }
      }
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
    instructions: instructions || prescriptionMedicine.instructions
  });

  return {
    success: true,
    message: "Thay thế thuốc thành công",
    data: {
      prescription_medicine_id: newPrescriptionMedicine.prescription_medicine_id,
      original_medicine: {
        medicine_id: prescriptionMedicine.medicine.medicine_id,
        name: prescriptionMedicine.medicine.name,
        unit: prescriptionMedicine.medicine.unit,
        price: prescriptionMedicine.medicine.price ? 
          `${prescriptionMedicine.medicine.price.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'
      },
      new_medicine: {
        medicine_id: newMedicine.medicine_id,
        name: newMedicine.name,
        unit: newMedicine.unit,
        price: newMedicine.price ? 
          `${newMedicine.price.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'
      },
      quantity: actual_quantity,
      total_price: newMedicine.price * actual_quantity ? 
        `${(newMedicine.price * actual_quantity).toLocaleString('vi-VN')} VNĐ` : '0 VNĐ',
      prescribed: {
        dosage: dosage || prescriptionMedicine.dosage || 'Chưa có thông tin',
        frequency: frequency || prescriptionMedicine.frequency || 'Chưa có thông tin',
        duration: duration || prescriptionMedicine.duration || 'Chưa có thông tin',
        instructions: instructions || prescriptionMedicine.instructions || 'Chưa có hướng dẫn'
      }
    }
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
            as: "medicine"
          }
        ]
      },
      {
        model: db.PrescriptionPayment,
        as: "prescriptionPayments"
      }
    ]
  });

  if (!prescription) {
    throw new NotFoundError("Không tìm thấy đơn thuốc");
  }

  if (prescription.status === "completed") {
    throw new BadRequestError("Đơn thuốc đã được xác nhận phát thuốc trước đó");
  }

  if (!prescription.prescriptionMedicines || prescription.prescriptionMedicines.length === 0) {
    throw new BadRequestError("Đơn thuốc không có thuốc để xác nhận");
  }

  // Kiểm tra thanh toán
  if (!prescription.prescriptionPayments || prescription.prescriptionPayments.status !== 'paid') {
    throw new BadRequestError("Đơn thuốc chưa được thanh toán");
  }

  // Kiểm tra số lượng thuốc thực tế
  for (const item of prescription.prescriptionMedicines) {
    if (!item.actual_quantity && item.actual_quantity !== 0) {
      throw new BadRequestError(`Chưa nhập số lượng thực tế cho thuốc ${item.medicine.name}`);
    }

    // Kiểm tra số lượng tồn kho
    if (item.actual_quantity > item.medicine.quantity) {
      throw new BadRequestError(
        `Thuốc ${item.medicine.name} không đủ số lượng trong kho. Hiện chỉ còn ${item.medicine.quantity} ${item.medicine.unit}`
      );
    }

    // Cập nhật số lượng tồn kho
    await item.medicine.update({
      quantity: item.medicine.quantity - item.actual_quantity,
      is_out_of_stock: (item.medicine.quantity - item.actual_quantity) === 0
    });
  }

  // Cập nhật đơn thuốc đã được phát
  await prescription.update({
    status: "completed",
    pharmacist_id,
    completed_at: new Date()
  });

  return {
    success: true,
    message: "Xác nhận phát thuốc thành công",
    data: {
      prescription_id: prescription.prescription_id,
      completed_at: dayjs(prescription.completed_at).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
      pharmacist_id: prescription.pharmacist_id,
      medicines: prescription.prescriptionMedicines.map(item => ({
        medicine_name: item.medicine.name,
        actual_quantity: item.actual_quantity,
        remaining_quantity: item.medicine.quantity - item.actual_quantity
      }))
    }
  };
};

export const confirmPrescriptionPreparation = async (prescription_id, pharmacist_id) => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id: pharmacist_id },
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['username']
      }]
    });

    if (!pharmacist) {
      console.log('Không tìm thấy pharmacist với user_id:', pharmacist_id);
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    console.log('Found pharmacist:', {
      pharmacist_id: pharmacist.pharmacist_id,
      user_id: pharmacist.user_id,
      username: pharmacist.user?.username
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
              as: "medicine"
            }
          ]
        }
      ],
      transaction: t
    });

    if (!prescription) {
      throw new NotFoundError("Không tìm thấy đơn thuốc");
    }

    // 3. Kiểm tra trạng thái xác nhận
    if (prescription.status !== "pending_prepare") {
      throw new BadRequestError("Đơn thuốc không ở trạng thái chờ chuẩn bị");
    }

    // 4. Kiểm tra danh sách thuốc
    if (!prescription.prescriptionMedicines || prescription.prescriptionMedicines.length === 0) {
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
    const prescriptionPayment = await db.PrescriptionPayment.create({
      prescription_id: prescription.prescription_id,
      amount: totalAmount,
      status: 'pending',
      created_by: pharmacist.pharmacist_id,
      createdAt: new Date()
    }, { transaction: t });

    // 7. Cập nhật đơn thuốc
    await prescription.update({
      status: "waiting_payment",
      pharmacist_id: pharmacist.pharmacist_id,
      confirmed_at: new Date()
    }, { transaction: t });

    await t.commit();

    // 8. Trả về kết quả
    return {
      success: true,
      message: "Xác nhận chuẩn bị thuốc thành công",
      data: {
        prescription_id: prescription.prescription_id,
        confirmed_at: dayjs(prescription.confirmed_at)
          .tz('Asia/Ho_Chi_Minh')
          .format('YYYY-MM-DD HH:mm:ss'),
        payment: {
          prescription_payment_id: prescriptionPayment.prescription_payment_id,
          amount: `${totalAmount.toLocaleString('vi-VN')} VNĐ`,
          status: prescriptionPayment.status
        },
        medicines: prescription.prescriptionMedicines.map(item => ({
          medicine_id: item.medicine.medicine_id,
          name: item.medicine.name,
          quantity: item.quantity,
          unit: item.medicine.unit,
          unit_price: `${item.medicine.price.toLocaleString('vi-VN')} VNĐ`,
          total_price: `${(item.quantity * item.medicine.price).toLocaleString('vi-VN')} VNĐ`,
          prescribed: {
            dosage: item.dosage || 'Chưa có thông tin',
            frequency: item.frequency || 'Chưa có thông tin', 
            duration: item.duration || 'Chưa có thông tin',
            instructions: item.instructions || 'Chưa có hướng dẫn'
          }
        })),
        pharmacist: {
          pharmacist_id: pharmacist.pharmacist_id,
          name: pharmacist.user ? pharmacist.user.username : null
        }
      }
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
}

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
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['username']
      }]
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
                  attributes: ["username", "email"]
                }
              ]
            }
          ]
        }
      ]
    });

    if (!prescription) {
      throw new NotFoundError("Không tìm thấy đơn thuốc");
    }

    // 3. Kiểm tra điều kiện từ chối
    if (!prescription.use_hospital_pharmacy) {
      throw new BadRequestError("Đơn thuốc này không sử dụng nhà thuốc bệnh viện");
    }

    if (prescription.status === "completed" || prescription.status === "cancelled") {
      throw new BadRequestError("Không thể từ chối đơn thuốc đã hoàn tất hoặc đã hủy");
    }

    // 4. Cập nhật đơn thuốc
    await prescription.update({
      status: "cancelled",
      cancel_reason: reason,
      cancelled_at: new Date(),
      cancelled_by: pharmacist.pharmacist_id
    }, { transaction: t });

    // 5. Nếu đã có payment, cập nhật trạng thái payment thành cancelled
    const prescriptionPayment = await db.PrescriptionPayment.findOne({
      where: { prescription_id },
      transaction: t
    });

    if (prescriptionPayment && prescriptionPayment.status === 'pending') {
      await prescriptionPayment.update({
        status: 'cancelled',
        updated_by: pharmacist.pharmacist_id,
        note: `Đơn thuốc bị từ chối: ${reason}`
      }, { transaction: t });
    }

    await t.commit();

    // 6. Trả về kết quả
    return {
      success: true,
      message: "Từ chối đơn thuốc thành công",
      data: {
        prescription_id: prescription.prescription_id,
        cancelled_at: dayjs(prescription.cancelled_at).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
        cancel_reason: prescription.cancel_reason,
        pharmacist: {
          pharmacist_id: pharmacist.pharmacist_id,
          name: pharmacist.user.username
        },
        patient: {
          name: prescription.Appointment.Patient.user.username,
          email: prescription.Appointment.Patient.user.email
        }
      }
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
  limit = 10
}) => {
  const offset = (page - 1) * limit;
  const whereClause = {
    use_hospital_pharmacy: true // Chỉ lấy đơn thuốc được phát tại nhà thuốc bệnh viện
  };
  const paymentWhereClause = {};

  // Lọc theo thời gian
  if (start_date || end_date) {
    whereClause.createdAt = {};
    if (start_date) {
      whereClause.createdAt[Op.gte] = dayjs.tz(start_date, 'Asia/Ho_Chi_Minh').startOf('day').toDate();
    }
    if (end_date) {
      whereClause.createdAt[Op.lte] = dayjs.tz(end_date, 'Asia/Ho_Chi_Minh').endOf('day').toDate();
    }
  }
  if (date) {
    const startOfDay = dayjs.tz(date, 'Asia/Ho_Chi_Minh').startOf('day').toDate();
    const endOfDay = dayjs.tz(date, 'Asia/Ho_Chi_Minh').endOf('day').toDate();
    whereClause.createdAt = {
      [Op.between]: [startOfDay, endOfDay]
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
  console.log('Search Conditions:', {
    whereClause,
    paymentWhereClause,
    page,
    limit,
    offset
  });

  // Thực hiện truy vấn
  const { count, rows } = await db.Prescription.findAndCountAll({
    attributes: [
      'prescription_id',
      'pharmacist_id',
      'appointment_id',
      'status',
      'createdAt',
      'confirmed_at',
      'completed_at',
      'cancelled_at',
      'rejected_at',
      'rejection_reason',
      'cancel_reason'
    ],
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
          "total_price"
        ],
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
              "is_out_of_stock"
            ],
          },
        ],
      },
      {
        model: db.Appointment,
        as: "Appointment",
        required: false,
        attributes: ["appointment_id", "appointment_datetime", "status"],
        include: [
          {
            model: db.Patient,
            as: "Patient",
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
        attributes: ["prescription_payment_id", "amount", "status", "payment_method", "payment_date"]
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
            attributes: ["username"]
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true
  });

  // Log kết quả truy vấn để debug
  console.log('Query Results:', {
    totalRecords: count,
    recordsReturned: rows.length
  });

  const prescriptions = rows.map(prescription => ({
    prescription_id: prescription.prescription_id,
    created_at: dayjs(prescription.createdAt).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
    status: prescription.status,
    status_info: {
      confirmed_at: prescription.confirmed_at ? 
        dayjs(prescription.confirmed_at).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') : null,
      completed_at: prescription.completed_at ? 
        dayjs(prescription.completed_at).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') : null,
      cancelled_at: prescription.cancelled_at ? 
        dayjs(prescription.cancelled_at).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') : null,
      rejected_at: prescription.rejected_at ? 
        dayjs(prescription.rejected_at).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') : null,
      rejection_reason: prescription.rejection_reason,
      cancel_reason: prescription.cancel_reason
    },
    appointment: prescription.Appointment ? {
      appointment_id: prescription.Appointment.appointment_id,
      datetime: prescription.Appointment.appointment_datetime ? 
        dayjs(prescription.Appointment.appointment_datetime)
          .tz('Asia/Ho_Chi_Minh')
          .format('YYYY-MM-DD HH:mm:ss') : null,
      status: prescription.Appointment.status,
      patient: prescription.Appointment.Patient?.user ? {
        name: prescription.Appointment.Patient.user.username,
        email: prescription.Appointment.Patient.user.email
      } : null,
      doctor: prescription.Appointment.Doctor?.user ? {
        name: prescription.Appointment.Doctor.user.username,
        email: prescription.Appointment.Doctor.user.email
      } : null
    } : null,
    medicines: prescription.prescriptionMedicines?.map(item => ({
      prescription_medicine_id: item.prescription_medicine_id,
      medicine: item.medicine ? {
        medicine_id: item.medicine.medicine_id,
        name: item.medicine.name,
        unit: item.medicine.unit,
        price: item.medicine.price ? `${item.medicine.price.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ',
        status: item.medicine.is_out_of_stock ? 'Tạm hết hàng' : 'Còn hàng'
      } : null,
      prescribed: {
        quantity: item.quantity || 0,
        dosage: item.dosage || 'Chưa có thông tin',
        frequency: item.frequency || 'Chưa có thông tin',
        duration: item.duration || 'Chưa có thông tin',
        instructions: item.instructions || 'Chưa có hướng dẫn',
        total_price: item.total_price ? `${item.total_price.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'
      },
      dispensed: {
        quantity: item.actual_quantity || null,
      }
    })) || [],
    payment: prescription.prescriptionPayments ? {
      payment_id: prescription.prescriptionPayments.prescription_payment_id,
      amount: prescription.prescriptionPayments.amount ? 
        `${prescription.prescriptionPayments.amount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ',
      status: prescription.prescriptionPayments.status,
      payment_method: prescription.prescriptionPayments.payment_method,
      payment_date: prescription.prescriptionPayments.payment_date ? 
        dayjs(prescription.prescriptionPayments.payment_date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') : null
    } : null,
    pharmacist: prescription.pharmacist?.user ? {
      pharmacist_id: prescription.pharmacist.pharmacist_id,
      name: prescription.pharmacist.user.username
    } : null
  }));

  return {
    success: true,
    message: "Lấy danh sách đơn thuốc thành công",
    data: {
      prescriptions,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_records: count,
        per_page: limit
      }
    }
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
export const updatePrescriptionPaymentStatus = async (user_id, prescription_payment_id, payment_method, note = '') => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Kiểm tra dược sĩ tồn tại
    const pharmacist = await db.Pharmacist.findOne({
      where: { user_id },
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['username']
      }]
    });

    if (!pharmacist) {
      throw new NotFoundError("Không tìm thấy thông tin dược sĩ");
    }

    // 2. Kiểm tra thanh toán tồn tại
    const prescriptionPayment = await db.PrescriptionPayment.findOne({
      where: { prescription_payment_id },
      include: [{
        model: db.Prescription,
        as: "prescription",
        include: [{
          model: db.Appointment,
          as: "Appointment",
          include: [{
            model: db.Patient,
            as: "Patient",
            include: [{
              model: db.User,
              as: "user",
              attributes: ["username", "email"]
            }]
          }]
        }]
      }],
      transaction: t
    });

    if (!prescriptionPayment) {
      throw new NotFoundError("Không tìm thấy thanh toán đơn thuốc");
    }

    // 3. Kiểm tra trạng thái hiện tại
    if (prescriptionPayment.status === 'paid') {
      throw new BadRequestError("Đơn thuốc đã được thanh toán trước đó");
    }

    if (prescriptionPayment.status === 'cancelled') {
      throw new BadRequestError("Đơn thuốc đã bị hủy");
    }

    // 4. Kiểm tra phương thức thanh toán hợp lệ
    const validPaymentMethods = ['cash', 'zalopay'];
    if (!validPaymentMethods.includes(payment_method)) {
      throw new BadRequestError("Phương thức thanh toán không hợp lệ");
    }

    let status = 'pending';
    let paymentDate = null;

    // 5. Xử lý theo phương thức thanh toán
    switch (payment_method) {
      case 'cash':
        // Thanh toán tiền mặt -> tự động chuyển trạng thái thành paid
        status = 'paid';
        paymentDate = new Date();
        break;
      
      case 'zalopay':
        // TODO: Tích hợp ZaloPay trong tương lai
        // Hiện tại throw error vì chưa hỗ trợ
        throw new BadRequestError("Phương thức thanh toán ZaloPay chưa được hỗ trợ");
        break;
    }

    // 6. Cập nhật thanh toán
    await prescriptionPayment.update({
      status,
      payment_method,
      note: note || prescriptionPayment.note,
      payment_date: paymentDate,
      updated_by: pharmacist.pharmacist_id
    }, { transaction: t });

    // 7. Nếu thanh toán thành công, cập nhật trạng thái đơn thuốc
    if (status === 'paid') {
      await prescriptionPayment.prescription.update({
        status: "completed",
        completed_at: new Date(),
        pharmacist_id: pharmacist.pharmacist_id
      }, { transaction: t });
    }

    await t.commit();

    // 8. Trả về kết quả
    return {
      success: true,
      message: "Cập nhật trạng thái thanh toán đơn thuốc thành công",
      data: {
        prescription_payment_id: prescriptionPayment.prescription_payment_id,
        prescription_id: prescriptionPayment.prescription_id,
        amount: `${prescriptionPayment.amount.toLocaleString('vi-VN')} VNĐ`,
        status: prescriptionPayment.status,
        payment_method: prescriptionPayment.payment_method,
        payment_date: prescriptionPayment.payment_date ? 
          dayjs(prescriptionPayment.payment_date).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss') : null,
        note: prescriptionPayment.note,
        patient: {
          name: prescriptionPayment.prescription.Appointment.Patient.user.username,
          email: prescriptionPayment.prescription.Appointment.Patient.user.email
        },
        pharmacist: {
          pharmacist_id: pharmacist.pharmacist_id,
          name: pharmacist.user.username
        }
      }
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};