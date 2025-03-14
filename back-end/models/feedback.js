"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Feedback extends Model {
    static associate(models) {
      Feedback.belongsTo(models.Appointment, { foreignKey: "appointment_id" });
    }
  }
  Feedback.init(
    {
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "appointments", key: "appointment_id" },
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Feedback",
      tableName: "feedback",
      timestamps: true,
    }
  );
  return Feedback;
};
