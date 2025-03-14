"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Appointment, { foreignKey: "appointment_id" });
    }
  }
  Payment.init(
    {
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "appointments", key: "appointment_id" },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.ENUM("credit_card", "online", "cash", "VNPay", "MoMo", "ZaloPay"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("paid", "pending"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      sequelize,
      modelName: "Payment",
      tableName: "payments",
      timestamps: true,
    }
  );
  return Payment;
};
