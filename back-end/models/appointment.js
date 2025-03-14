"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      Appointment.belongsTo(models.Patient, { foreignKey: "patient_id" });
      Appointment.belongsTo(models.Doctor, { foreignKey: "doctor_id" });
      Appointment.belongsTo(models.Appointment, { foreignKey: "rescheduled_to", as: "rescheduled_appointment" });
    }
  }
  Appointment.init(
    {
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "patients", key: "patient_id" },
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "doctors", key: "doctor_id" },
      },
      appointment_datetime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "waiting_for_confirmation",
          "accepted",
          "cancelled",
          "completed",
          "rescheduled",
          "no_show"
        ),
        allowNull: false,
        defaultValue: "waiting_for_confirmation",
      },
      rescheduled_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "appointments", key: "appointment_id" },
      },
      reschedule_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      doctor_confirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Appointment",
      tableName: "appointments",
      timestamps: true,
    }
  );
  return Appointment;
};
