import { Sequelize } from "sequelize";
import dbConfig from "../config/config.js";
import UserModel from "./user.js";
import PatientModel from "./patients.js";
import DoctorModel from "./doctors.js";
import PharmacistModel from "./pharmacists.js";
import AdminModel from "./admins.js";
import SpecializationModel from "./specialization.js";
import AppointmentModel from "./appointment.js";
import FeedbackModel from "./feedbacks.js";
import PrescriptionModel from "./prescriptions.js";
import MedicineModel from "./medicines.js";
import PrescriptionMedicineModel from "./prescription-medicines.js";
import PrescriptionPaymentModel from "./prescription-payments.js";
import PaymentModel from "./payments.js";
import MedicalRecordModel from "./medicalRecords.js";
import ScheduleModel from "./schedules.js";

const sequelize = new Sequelize(dbConfig.development);

const db = {
  sequelize,
  Sequelize,
  User: UserModel(sequelize, Sequelize.DataTypes),
  Patient: PatientModel(sequelize, Sequelize.DataTypes),
  Doctor: DoctorModel(sequelize, Sequelize.DataTypes),
  Pharmacist: PharmacistModel(sequelize, Sequelize.DataTypes),
  Admin: AdminModel(sequelize, Sequelize.DataTypes),
  Specialization: SpecializationModel(sequelize, Sequelize.DataTypes),
  Appointment: AppointmentModel(sequelize, Sequelize.DataTypes),
  Feedback: FeedbackModel(sequelize, Sequelize.DataTypes),
  Prescription: PrescriptionModel(sequelize, Sequelize.DataTypes),
  Medicine: MedicineModel(sequelize, Sequelize.DataTypes),
  PrescriptionMedicine: PrescriptionMedicineModel(sequelize, Sequelize.DataTypes),
  PrescriptionPayment: PrescriptionPaymentModel(sequelize, Sequelize.DataTypes),
  Payment: PaymentModel(sequelize, Sequelize.DataTypes),
  MedicalRecord: MedicalRecordModel(sequelize, Sequelize.DataTypes),
  Schedule: ScheduleModel(sequelize, Sequelize.DataTypes),
};

// Thiết lập các quan hệ giữa các bảng (nếu có)
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
