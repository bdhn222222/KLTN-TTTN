import { Sequelize } from "sequelize";
import dbConfig from "../config/config.js";
import User from "./user.js";
import Patient from "./patients.js";
import Doctor from "./doctors.js";
import Pharmacist from "./pharmacists.js";
import Admin from "./admins.js";
import Specialization from "./specialization.js";
import Appointment from "./appointment.js";
import Feedback from "./feedbacks.js";
import Prescription from "./prescriptions.js";
import Medicine from "./medicines.js";
import PrescriptionMedicine from "./prescription-medicines.js";
import PrescriptionPayment from "./prescription_payment.js";
import Payment from "./payments.js";
import MedicalRecord from "./medicalRecords.js";
import Schedule from "./schedules.js";
import DoctorDayOff from "./doctor-day-offs.js";
import CompensationCode from "./compensationCode.js";
import RetailPrescription from "./retailPrescriptions.js";
import RetailPrescriptionMedicine from "./retailPrescriptionMedicines.js";
import RetailPrescriptionPayment from "./retailPrescriptionPayments.js";
import FamilyMember from "./familyMember.js";
import Symptom from "./symptom.js";
import SymptomSpecializationMapping from "./symptomSpecializationMapping.js";

const sequelize = new Sequelize(dbConfig.development);

const db = {
  sequelize,
  Sequelize,
  User: User(sequelize, Sequelize.DataTypes),
  Patient: Patient(sequelize, Sequelize.DataTypes),
  Doctor: Doctor(sequelize, Sequelize.DataTypes),
  DoctorDayOff: DoctorDayOff(sequelize, Sequelize.DataTypes),
  Pharmacist: Pharmacist(sequelize, Sequelize.DataTypes),
  Admin: Admin(sequelize, Sequelize.DataTypes),
  Specialization: Specialization(sequelize, Sequelize.DataTypes),
  Appointment: Appointment(sequelize, Sequelize.DataTypes),
  Feedback: Feedback(sequelize, Sequelize.DataTypes),
  Prescription: Prescription(sequelize, Sequelize.DataTypes),
  Medicine: Medicine(sequelize, Sequelize.DataTypes),
  PrescriptionMedicine: PrescriptionMedicine(sequelize, Sequelize.DataTypes),
  PrescriptionPayment: PrescriptionPayment(sequelize, Sequelize.DataTypes),
  Payment: Payment(sequelize, Sequelize.DataTypes),
  MedicalRecord: MedicalRecord(sequelize, Sequelize.DataTypes),
  Schedule: Schedule(sequelize, Sequelize.DataTypes),
  CompensationCode: CompensationCode(sequelize, Sequelize.DataTypes),
  RetailPrescription: RetailPrescription(sequelize, Sequelize.DataTypes),

  RetailPrescriptionMedicine: RetailPrescriptionMedicine(
    sequelize,
    Sequelize.DataTypes
  ),
  RetailPrescriptionPayment: RetailPrescriptionPayment(
    sequelize,
    Sequelize.DataTypes
  ),
  FamilyMember: FamilyMember(sequelize, Sequelize.DataTypes),
  Symptom: Symptom(sequelize, Sequelize.DataTypes),
  SymptomSpecializationMapping: SymptomSpecializationMapping(
    sequelize,
    Sequelize.DataTypes
  ),
};

// Thiết lập các quan hệ giữa các bảng (nếu có)
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
