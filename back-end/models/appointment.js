import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Appointment extends Model {
    static associate(models) {
      Appointment.belongsTo(models.Doctor, { foreignKey: "doctor_id", as: "doctor" });
      Appointment.belongsTo(models.Patient, { foreignKey: "patient_id", as: "patient" });
      Appointment.hasOne(models.Feedback, { foreignKey: "appointment_id", as: "feedback" });
      Appointment.hasOne(models.Prescription, { foreignKey: "appointment_id", as: "prescription" });
      Appointment.hasOne(models.MedicalRecord, { foreignKey: "appointment_id", as: "medicalRecord" });
      Appointment.hasOne(models.Payment, { foreignKey: "appointment_id", as: "payments" });
    }
  }

  Appointment.init(
    {
      appointment_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Patients",
          key: "patient_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Doctors",
          key: "doctor_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      appointment_datetime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("waiting_for_confirmation", "accepted", "cancelled", "completed", "rescheduled"),
        allowNull: false,
        defaultValue: "waiting_for_confirmation",
      },
      fees: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // rescheduled_to: {
      //   type: DataTypes.INTEGER,
      //   allowNull: true,
      //   references: {
      //     model: "Appointments",
      //     key: "appointment_id",
      //   },
      //   onUpdate: "SET NULL",
      //   onDelete: "SET NULL",
      // },
      // reschedule_count: {
      //   type: DataTypes.INTEGER,
      //   allowNull: false,
      //   defaultValue: 0,
      // },
    },
    {
      sequelize,
      modelName: "Appointment",
      tableName: "Appointments",
      timestamps: true,
    }
  );

  return Appointment;
};
