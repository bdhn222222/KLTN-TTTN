"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicalRecord extends Model {
    static associate(models) {
      MedicalRecord.belongsTo(models.Appointment, { foreignKey: "appointment_id" });
    }
  }
  MedicalRecord.init(
    {
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "appointments", key: "appointment_id" },
      },
      diagnosis: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      treatment: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MedicalRecord",
      tableName: "medicalRecords",
      timestamps: true,
    }
  );
  return MedicalRecord;
};
