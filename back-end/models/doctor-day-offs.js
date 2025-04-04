// models/doctorDayOffs.js
import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class DoctorDayOff extends Model {
    static associate(models) {
      DoctorDayOff.belongsTo(models.Doctor, {
        foreignKey: "doctor_id",
        as: "doctor",
      });
    }
  }

  DoctorDayOff.init(
    {
      day_off_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      off_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      off_morning: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      off_afternoon: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM("active", "cancelled"),
        defaultValue: "active",
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "cancelled"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      sequelize,
      modelName: "DoctorDayOff",
      tableName: "DoctorDayOffs",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return DoctorDayOff;
};
