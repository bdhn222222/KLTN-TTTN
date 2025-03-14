const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Pharmacist extends Model {}

Pharmacist.init(
  {
    pharmacist_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    license_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Pharmacist",
    tableName: "pharmacists",
    timestamps: true,
  }
);

module.exports = Pharmacist;
