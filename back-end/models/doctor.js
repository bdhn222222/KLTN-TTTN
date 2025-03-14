const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Doctor extends Model {}

Doctor.init(
  {
    doctor_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    specialization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "specializations", key: "specialization_id" },
    },
    license_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    work_schedule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    experience_years: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Doctor",
    tableName: "doctors",
    timestamps: true,
  }
);

module.exports = Doctor;
