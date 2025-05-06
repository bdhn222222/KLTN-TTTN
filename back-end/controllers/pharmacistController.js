import {
  registerPharmacist,
  loginPharmacist,
  //getPendingPrescriptions,
  getPrescriptionDetails,
  updatePrescriptionItem,
  completePrescription,
  getAllMedicines,
  addMedicine,
  updateMedicine,
  getMedicineById,
  deleteMedicine,
  getPharmacistProfile,
  updatePharmacistProfile,
  changePharmacistPassword,
  getAllPrescriptions,
  confirmPrescriptionPreparation,
  updatePrescriptionPaymentStatus,
  cancelPrescription,
  getAllPrescriptionPayments,
  createRetailPrescription,
  getAllRetailPrescriptions,
  getRetailPrescriptionDetails,
  updateRetailPrescription,
  updateRetailPrescriptionStatus,
  updateRetailPrescriptionPaymentStatus,
  completeRetailPrescription,
  getAllRetailPrescriptionPayments,
  cancelRetailPrescription,
  getPrescriptionDetailsWithFIFO,
  prepareAndPayPrescription,
  addMedicineBatch,
  updateMedicineBatch,
  deleteBatch,
} from "../services/pharmacistService.js";
import BadRequestError from "../errors/bad_request.js";
import asyncHandler from "express-async-handler";
import InternalServerError from "../errors/internalServerError.js";
import NotFoundError from "../errors/not_found.js";

// export const registerPharmacistController = async (req, res, next) => {
//   try {
//     const patient = await registerPharmacist(req.body);
//     res.status(201).json(patient);
//   } catch (error) {
//     if (error instanceof BadRequestError) {
//       next(error);
//     } else {
//       next(new InternalServerError(error.message));
//     }
//   }
// };
// export const loginPharmacistController = async (req, res, next) => {
//   try {
//     const patient = await loginPharmacist(req.body);
//     res.status(200).json(patient);
//   } catch (error) {
//     if (error instanceof BadRequestError) {
//       next(error);
//     } else {
//       next(new InternalServerError(error.message));
//     }
//   }
// };
//
export const registerPharmacistController = asyncHandler(async (req, res) => {
  const pharmacist = await registerPharmacist(req.body);
  res.status(201).json(pharmacist);
});

export const loginPharmacistController = asyncHandler(async (req, res) => {
  const pharmacist = await loginPharmacist(req.body);
  res.status(200).json(pharmacist);
});
export const getPrescriptionDetailsController = asyncHandler(
  async (req, res, next) => {
    const { prescription_id } = req.params;

    try {
      const prescription = await getPrescriptionDetails(prescription_id);

      res.status(200).json({
        success: true,
        message: "Lấy thông tin đơn thuốc thành công",
        data: prescription,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return next(error);
      }
      return next(new InternalServerError(error.message));
    }
  }
);
export const getAllPrescriptionsController = asyncHandler(async (req, res) => {
  const {
    start_date,
    end_date,
    date,
    payment_status,
    status,
    page = 1,
    limit = 10,
  } = req.query;

  const result = await getAllPrescriptions({
    start_date,
    end_date,
    date,
    payment_status,
    status,
    page: parseInt(page),
    limit: parseInt(limit),
  });

  res.status(200).json(result);
});

//     res.status(200).json(result);
//   } catch (error) {
//     next(
//       error instanceof BadRequestError
//         ? error
//         : new InternalServerError(error.message)
//     );
//   }
// };
// export const confirmPrescriptionController = async (req, res, next) => {
//   try {
//     const { prescription_id } = req.params;
//     const pharmacist_id = req.user.user_id;

//     const result = await confirmPrescription(prescription_id, pharmacist_id);

//     res.status(200).json(result);
//   } catch (error) {
//     if (error instanceof BadRequestError || error instanceof NotFoundError) {
//       return next(error);
//     }
//     next(new InternalServerError(error.message));
//   }
// };
export const updatePrescriptionItemController = asyncHandler(
  async (req, res) => {
    const { prescription_id } = req.params;
    const {
      original_medicine_id,
      new_medicine_id,
      actual_quantity,
      dosage,
      frequency,
      duration,
      instructions,
    } = req.body;

    if (
      !original_medicine_id ||
      !new_medicine_id ||
      actual_quantity === undefined
    ) {
      throw new BadRequestError("Thiếu thông tin cập nhật thuốc");
    }

    const result = await updatePrescriptionItem(
      prescription_id,
      original_medicine_id,
      new_medicine_id,
      actual_quantity,
      dosage,
      frequency,
      duration,
      instructions
    );

    res.status(200).json(result);
  }
);

export const completePrescriptionController = asyncHandler(async (req, res) => {
  const { prescription_id } = req.params;
  const pharmacist_id = req.user.user_id;

  const result = await completePrescription(prescription_id, pharmacist_id);

  res.status(200).json(result);
});

export const confirmPrescriptionPreparationController = asyncHandler(
  async (req, res) => {
    const { prescription_id } = req.params;
    const pharmacist_id = req.user.user_id;

    // Thêm log để debug
    console.log("User from token:", req.user);
    console.log("Pharmacist ID:", pharmacist_id);

    const result = await confirmPrescriptionPreparation(
      prescription_id,
      pharmacist_id
    );

    res.status(200).json(result);
  }
);

// export const getAllMedicinesController = async (req, res, next) => {
//   try {
//     const { search, expiry_before, page } = req.query;
//     const result = await getAllMedicines({ search, expiry_before, page });
//     res.status(200).json(result);
//   } catch (error) {
//     if (error instanceof NotFoundError) return next(error);
//     next(new InternalServerError(error.message));
//   }
// };
// export const addMedicineController = async (req, res, next) => {
//   try {
//     const result = await addMedicine(req.body);
//     res.status(201).json(result);
//   } catch (error) {
//     if (error instanceof BadRequestError) return next(error);
//     return next(new InternalServerError(error.message));
//   }
// };

// export const updateMedicineController = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const updateData = req.body;

//     const result = await updateMedicine(id, updateData);
//     res.status(200).json(result);
//   } catch (error) {
//     next(error);
//   }
// };
// export const getMedicineByIdController = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const result = await getMedicineById(id);
//     res.status(200).json(result);
//   } catch (error) {
//     next(error);
//   }
// };
// export const deleteMedicineController = asyncHandler(async (req, res) => {
//   const medicine_id = req.params.id;
//   const result = await deleteMedicine(medicine_id);
//   res.json(result);
// });

// Lấy danh sách thuốc
export const getAllMedicinesController = asyncHandler(async (req, res) => {
  const { search, expiry_before, page, limit } = req.query;

  // Convert pagination parameters to numbers
  const parsedPage = page ? parseInt(page, 10) : 1;
  const parsedLimit = limit ? parseInt(limit, 10) : 10;

  // Validate pagination parameters
  if (isNaN(parsedPage) || parsedPage < 1) {
    return res.status(400).json({
      success: false,
      message: "Tham số page không hợp lệ",
    });
  }

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return res.status(400).json({
      success: false,
      message: "Tham số limit không hợp lệ",
    });
  }

  const result = await getAllMedicines({
    search,
    expiry_before,
    page: parsedPage,
    limit: parsedLimit,
  });

  res.status(200).json(result);
});

// Thêm thuốc mới
export const addMedicineController = asyncHandler(async (req, res) => {
  try {
    const result = await addMedicine(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Cập nhật thuốc
export const updateMedicineController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const result = await updateMedicine(id, updateData);
  res.status(200).json(result);
});

// Lấy chi tiết thuốc
export const getMedicineByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate medicine_id
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "ID thuốc không hợp lệ",
    });
  }

  const result = await getMedicineById(id);
  res.status(200).json(result);
});

// Xóa thuốc
export const deleteMedicineController = asyncHandler(async (req, res) => {
  const medicine_id = req.params.id;
  const result = await deleteMedicine(medicine_id);
  res.json(result);
});
export const getPharmacistProfileController = asyncHandler(async (req, res) => {
  const user_id = req.user.user_id;
  const profile = await getPharmacistProfile(user_id);
  res.status(200).json({
    message: "Lấy hồ sơ cá nhân thành công",
    data: profile,
  });
});
export const updatePharmacistProfileController = asyncHandler(
  async (req, res) => {
    const user_id = req.user.user_id;
    const updateData = req.body;
    const result = await updatePharmacistProfile(user_id, updateData);
    res.status(200).json(result);
  }
);
export const changePharmacistPasswordController = asyncHandler(
  async (req, res) => {
    const user_id = req.user.user_id;
    const result = await changePharmacistPassword(user_id, req.body);
    res.status(200).json(result);
  }
);

/**
 * Controller xử lý cập nhật trạng thái thanh toán đơn thuốc
 */
export const updatePrescriptionPaymentStatusController = asyncHandler(
  async (req, res) => {
    const user_id = req.user.user_id;
    const { prescription_payment_id } = req.params;
    const { payment_method, note } = req.body;

    // Validate input
    if (!prescription_payment_id) {
      throw new BadRequestError("Thiếu mã thanh toán đơn thuốc");
    }

    if (!payment_method) {
      throw new BadRequestError("Thiếu phương thức thanh toán");
    }

    // Validate payment method
    const validPaymentMethods = ["cash", "zalopay"];
    if (!validPaymentMethods.includes(payment_method)) {
      throw new BadRequestError("Phương thức thanh toán không hợp lệ");
    }

    const result = await updatePrescriptionPaymentStatus(
      user_id,
      prescription_payment_id,
      payment_method,
      note
    );

    res.status(200).json(result);
  }
);

/**
 * Controller xử lý huỷ đơn thuốc
 */
export const cancelPrescriptionController = asyncHandler(async (req, res) => {
  const { prescription_id } = req.params;
  const { reason } = req.body;
  const user_id = req.user.user_id;

  // Validate input
  if (!prescription_id) {
    throw new BadRequestError("Thiếu mã đơn thuốc");
  }

  if (!reason) {
    throw new BadRequestError("Vui lòng cung cấp lý do huỷ đơn");
  }

  const result = await cancelPrescription(prescription_id, reason, user_id);

  res.status(200).json(result);
});

/**
 * Controller xử lý lấy danh sách thanh toán đơn thuốc
 */
export const getAllPrescriptionPaymentsController = asyncHandler(
  async (req, res) => {
    const { status, start_date, end_date, page = 1, limit = 10 } = req.query;

    const result = await getAllPrescriptionPayments({
      status,
      start_date,
      end_date,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.status(200).json(result);
  }
);

export const createRetailPrescriptionController = asyncHandler(
  async (req, res) => {
    try {
      const { patient_id, medicines, note } = req.body;
      const pharmacist_id = req.user.user_id; // Giả sử dược sĩ đã được xác thực qua middleware

      // Gọi service createRetailPrescription để tạo đơn thuốc
      const result = await createRetailPrescription(
        { patient_id, medicines, note },
        pharmacist_id
      );

      // Trả về kết quả cho client
      res.status(200).json(result);
    } catch (error) {
      // Nếu có lỗi, trả lại thông báo lỗi cho client
      res.status(error.status || 500).json({ message: error.message });
    }
  }
);

/**
 * Controller xử lý lấy danh sách đơn thuốc bán lẻ
 */
export const getAllRetailPrescriptionsController = asyncHandler(
  async (req, res) => {
    const { status, start_date, end_date, page = 1, limit = 10 } = req.query;

    const result = await getAllRetailPrescriptions({
      status,
      start_date,
      end_date,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.status(200).json(result);
  }
);

/**
 * Controller xử lý lấy chi tiết đơn thuốc bán lẻ
 */
export const getRetailPrescriptionDetailsController = asyncHandler(
  async (req, res) => {
    const { retail_prescription_id } = req.params;

    // Validate input
    if (!retail_prescription_id) {
      throw new BadRequestError("Thiếu mã đơn thuốc bán lẻ");
    }

    const result = await getRetailPrescriptionDetails(retail_prescription_id);

    res.status(200).json(result);
  }
);

/**
 * Controller xử lý cập nhật đơn thuốc bán lẻ
 */
export const updateRetailPrescriptionController = asyncHandler(
  async (req, res) => {
    const { retail_prescription_id } = req.params;
    const { note, medicines } = req.body;
    const pharmacist_id = req.user.user_id;

    // Validate input
    if (!retail_prescription_id) {
      throw new BadRequestError("Thiếu mã đơn thuốc bán lẻ");
    }

    // Validate medicines nếu có
    if (medicines && medicines.length > 0) {
      for (const med of medicines) {
        if (!med.medicine_id) {
          throw new BadRequestError("Thiếu ID thuốc");
        }
        if (!med.quantity || med.quantity <= 0) {
          throw new BadRequestError("Số lượng thuốc phải lớn hơn 0");
        }
        if (!med.dosage) {
          throw new BadRequestError("Thiếu liều dùng");
        }
        if (!med.frequency) {
          throw new BadRequestError("Thiếu tần suất sử dụng");
        }
        if (!med.duration) {
          throw new BadRequestError("Thiếu thời gian sử dụng");
        }
        if (!med.instructions) {
          throw new BadRequestError("Thiếu hướng dẫn sử dụng");
        }
      }
    }

    // Gọi service để cập nhật đơn thuốc
    const result = await updateRetailPrescription(
      retail_prescription_id,
      { note, medicines },
      pharmacist_id
    );

    // Trả về kết quả
    res.status(200).json(result);
  }
);

/**
 * Controller xử lý cập nhật trạng thái đơn thuốc bán lẻ
 */
export const updateRetailPrescriptionStatusController = asyncHandler(
  async (req, res) => {
    const { retail_prescription_id } = req.params;
    const { status } = req.body;
    const pharmacist_id = req.user.user_id;

    // Validate input
    if (!retail_prescription_id) {
      throw new BadRequestError("Thiếu mã đơn thuốc bán lẻ");
    }

    if (!status) {
      throw new BadRequestError("Thiếu trạng thái mới");
    }

    // Validate status
    const validStatuses = [
      "pending_prepare",
      "waiting_payment",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError("Trạng thái không hợp lệ");
    }

    // Gọi service để cập nhật trạng thái
    const result = await updateRetailPrescriptionStatus(
      retail_prescription_id,
      status,
      pharmacist_id
    );

    // Trả về kết quả
    res.status(200).json(result);
  }
);

/**
 * Controller xử lý cập nhật trạng thái thanh toán đơn thuốc bán lẻ
 */
export const updateRetailPrescriptionPaymentStatusController = asyncHandler(
  async (req, res) => {
    const { payment_id } = req.params;
    const { payment_method, note } = req.body;
    const pharmacist_id = req.user.user_id;

    // Validate input
    if (!payment_id) {
      throw new BadRequestError("Thiếu mã thanh toán đơn thuốc");
    }

    if (!payment_method) {
      throw new BadRequestError("Thiếu phương thức thanh toán");
    }

    // Validate payment method
    const validPaymentMethods = ["cash", "zalopay"];
    if (!validPaymentMethods.includes(payment_method)) {
      throw new BadRequestError("Phương thức thanh toán không hợp lệ");
    }

    // Gọi service để cập nhật trạng thái thanh toán
    const result = await updateRetailPrescriptionPaymentStatus(
      payment_id,
      payment_method,
      pharmacist_id,
      note
    );

    // Trả về kết quả
    res.status(200).json(result);
  }
);

/**
 * Controller xử lý hoàn tất đơn thuốc bán lẻ
 */
export const completeRetailPrescriptionController = asyncHandler(
  async (req, res) => {
    const { retail_prescription_id } = req.params;
    const pharmacist_id = req.user.user_id;

    // Validate input
    if (!retail_prescription_id) {
      throw new BadRequestError("Thiếu mã đơn thuốc bán lẻ");
    }

    // Gọi service để hoàn tất đơn thuốc
    const result = await completeRetailPrescription(
      retail_prescription_id,
      pharmacist_id
    );

    // Trả về kết quả
    res.status(200).json(result);
  }
);

/**
 * Lấy danh sách thanh toán đơn thuốc bán lẻ
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export const getAllRetailPrescriptionPaymentsController = asyncHandler(
  async (req, res, next) => {
    const { status, start_date, end_date, page, limit } = req.query;

    const result = await getAllRetailPrescriptionPayments({
      status,
      start_date,
      end_date,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    });

    res.status(200).json(result);
  }
);

/**
 * Hủy đơn thuốc bán lẻ
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export const cancelRetailPrescriptionController = async (req, res, next) => {
  try {
    const { retail_prescription_id } = req.params;
    const { reason } = req.body;
    const pharmacist_id = req.user.user_id;

    // Kiểm tra lý do hủy đơn
    if (!reason) {
      throw new BadRequestError("Vui lòng cung cấp lý do hủy đơn");
    }

    const result = await cancelRetailPrescription(
      retail_prescription_id,
      reason,
      pharmacist_id
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/pharmacy/prescriptions/:prescription_id
 * @description Lấy chi tiết đơn thuốc với phân bổ FIFO
 * @access Private - Chỉ dược sĩ
 */
export const getPrescriptionDetailsWithFIFOController = async (
  req,
  res,
  next
) => {
  try {
    const { prescription_id } = req.params;
    const fifo = req.query.fifo !== "false"; // mặc định là true nếu không có query param hoặc khác "false"

    // Validate prescription_id
    if (!prescription_id || isNaN(prescription_id)) {
      throw new BadRequestError("ID đơn thuốc không hợp lệ");
    }

    const result = await getPrescriptionDetailsWithFIFO(
      parseInt(prescription_id),
      fifo
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const preparePrescriptionController = async (req, res, next) => {
  try {
    const prescription_id = req.params.prescription_id;
    if (isNaN(prescription_id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid prescription ID" });
    }

    const { lines, payment_method } = req.body;
    if (!Array.isArray(lines) || !payment_method) {
      return res
        .status(400)
        .json({ success: false, message: "Missing lines or payment_method" });
    }

    const result = await prepareAndPayPrescription(
      prescription_id,
      lines,
      payment_method
    );

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller xử lý thêm lô thuốc mới
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const addMedicineBatchController = asyncHandler(async (req, res) => {
  const { medicine_id } = req.params;
  const { batch_number, quantity, import_date, expiry_date, status } = req.body;

  // Validate medicine_id
  if (!medicine_id || isNaN(medicine_id)) {
    return res.status(400).json({
      success: false,
      message: "ID thuốc không hợp lệ",
    });
  }

  // Validate required fields
  if (!batch_number || !quantity || !import_date || !expiry_date) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng điền đầy đủ thông tin lô thuốc",
    });
  }

  const batchData = {
    batch_number,
    quantity: parseInt(quantity, 10),
    import_date,
    expiry_date,
    status: status || "Active",
  };

  const result = await addMedicineBatch(parseInt(medicine_id), batchData);

  res.status(201).json(result);
});

/**
 * Controller xử lý cập nhật thông tin lô thuốc
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const updateMedicineBatchController = asyncHandler(async (req, res) => {
  const { batch_id } = req.params;
  const { batch_number, quantity, import_date, expiry_date, status } = req.body;

  // Validate batch_id
  if (!batch_id || isNaN(batch_id)) {
    return res.status(400).json({
      success: false,
      message: "ID lô thuốc không hợp lệ",
    });
  }

  // Chuẩn bị dữ liệu cập nhật
  const batchData = {};

  if (batch_number) batchData.batch_number = batch_number;

  if (quantity !== undefined) {
    // Validate quantity
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng thuốc phải là số không âm",
      });
    }
    batchData.quantity = parsedQuantity;
  }

  if (import_date) batchData.import_date = import_date;
  if (expiry_date) batchData.expiry_date = expiry_date;

  if (status) {
    // Validate status
    const validStatuses = ["Active", "Expired", "Disposed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
    }
    batchData.status = status;
  }

  // Kiểm tra nếu không có thông tin cập nhật
  if (Object.keys(batchData).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Không có thông tin cập nhật",
    });
  }

  const result = await updateMedicineBatch(parseInt(batch_id), batchData);
  res.status(200).json(result);
});

export const deleteBatchController = asyncHandler(async (req, res) => {
  const { batch_id } = req.params;
  const result = await deleteBatch(parseInt(batch_id));
  res.status(200).json(result);
});
