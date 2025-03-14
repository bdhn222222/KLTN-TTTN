"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Prescription extends Model {
    static associate(models) {
      Prescription.belongsTo(models.Appointment, { foreignKey: "appointment_id" });
    }
  }
  Prescription.init(
    {
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "appointments", key: "appointment_id" },
      },
      medicine_details: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "dispensed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      total_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Prescription",
      tableName: "prescriptions",
      timestamps: true,
    }
  );
  return Prescription;
};
