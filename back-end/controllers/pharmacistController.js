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
export const getAllPrescriptionsController = async (req, res) => {
  try {
    const { user_id } = req.user; // Lấy từ JWT token
    const { 
      start_date,
      end_date,
      payment_status,
      dispensed_status,
      page = 1,
      limit = 10
    } = req.query;

    const result = await getAllPrescriptions({
      patient_id: user_id,
      start_date,
      end_date,
      payment_status,
      dispensed_status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(result);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    } else {
      console.error("Error in getAllPrescriptionsController:", error);
      res.status(500).json({
        success: false,
        message: "Đã có lỗi xảy ra khi lấy danh sách đơn thuốc"
      });
    }
  }
};


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
      instructions
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

export const confirmPrescriptionPreparationController = asyncHandler(async (req, res) => {
  const { prescription_id } = req.params;
  const pharmacist_id = req.user.pharmacist_id;

  const result = await confirmPrescriptionPreparation(prescription_id, pharmacist_id);

  res.status(200).json(result);
});

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
  const { search, expiry_before, page } = req.query;
  const result = await getAllMedicines({ search, expiry_before, page });
  res.status(200).json(result);
});

// Thêm thuốc mới
export const addMedicineController = asyncHandler(async (req, res) => {
  const result = await addMedicine(req.body);
  res.status(201).json(result);
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
