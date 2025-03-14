const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Patient extends Model {}

Patient.init(
  {
    patient_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    date_of_birth: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    insurance_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otp_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otp_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Patient",
    tableName: "patients",
    timestamps: true,
  }
);

module.exports = Patient;
