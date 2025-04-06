// models/doctorDayOffs.js
import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class DoctorDayOff extends Model {
    static associate(models) {
      DoctorDayOff.belongsTo(models.Doctor, {
        foreignKey: "doctor_id",
        as: "Doctor",
      });
      DoctorDayOff.belongsToMany(models.Appointment, {
        through: 'day_off_appointments',
        foreignKey: 'day_off_id',
        otherKey: 'appointment_id',
        as: 'AffectedAppointments'
      });
    }
  }

  DoctorDayOff.init(
    {
      day_off_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Doctors',
          key: 'doctor_id'
        },
      },
      off_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Ngày nghỉ'
      },
      off_morning: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Nghỉ buổi sáng'
      },
      off_afternoon: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Nghỉ buổi chiều'
      },
      status: {
        type: DataTypes.ENUM("active", "cancelled"),
        allowNull: false,
        defaultValue: "active",
        comment: 'Trạng thái của ngày nghỉ'
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Lý do nghỉ'
      },
      is_emergency: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Có phải là nghỉ khẩn cấp không'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Ngày tạo'
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Ngày cập nhật'
      }
    },
    {
      sequelize,
      modelName: "DoctorDayOffs",
      tableName: "DoctorDayOffs",
      timestamps: true,
      underscored: true
    }
  );

  return DoctorDayOff;
};
