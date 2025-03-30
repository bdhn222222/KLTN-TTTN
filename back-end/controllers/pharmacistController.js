import {
  registerPharmacist,
  loginPharmacist,
  getPendingPrescriptions,
  getPrescriptionDetails,
  updatePrescriptionItem,
  confirmPrescription,
} from "../services/pharmacistService.js";
import BadRequestError from "../errors/bad_request.js";
import InternalServerError from "../errors/internalServerError.js";

export const registerPharmacistController = async (req, res, next) => {
  try {
    const patient = await registerPharmacist(req.body);
    res.status(201).json(patient);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};
export const loginPharmacistController = async (req, res, next) => {
  try {
    const patient = await loginPharmacist(req.body);
    res.status(200).json(patient);
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      next(new InternalServerError(error.message));
    }
  }
};

export const getPendingPrescriptionsController = async (req, res, next) => {
  try {
    const prescriptions = await getPendingPrescriptions(); // 👈 Đảm bảo dòng này có
    res.status(200).json({
      message: "Lấy danh sách đơn thuốc cần xác nhận thành công",
      prescriptions,
    });
  } catch (error) {
    next(new InternalServerError(error.message));
  }
};
export const getPrescriptionDetailsController = async (req, res, next) => {
  try {
    const prescription_id = req.params.prescription_id;
    const prescription = await getPrescriptionDetails(prescription_id);
    res.status(200).json({
      message: "Lấy thông tin đơn thuốc thành công",
      prescription,
    });
  } catch (error) {
    next(new InternalServerError(error.message));
  }
};
export const updatePrescriptionItemController = async (req, res, next) => {
  try {
    const { prescription_id } = req.params;
    const { original_medicine_id, new_medicine_id, actual_quantity, note } =
      req.body;

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
      note
    );

    res.status(200).json(result);
  } catch (error) {
    next(
      error instanceof BadRequestError
        ? error
        : new InternalServerError(error.message)
    );
  }
};
export const confirmPrescriptionController = async (req, res, next) => {
  try {
    const { prescription_id } = req.params;
    const pharmacist_id = req.user.user_id;

    const result = await confirmPrescription(prescription_id, pharmacist_id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError(error.message));
  }
};
