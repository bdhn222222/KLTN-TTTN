import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Appointment extends Model {
    static associate(models) {
      Appointment.belongsTo(models.Doctor, { foreignKey: "doctor_id", as: "Doctor" });
      Appointment.belongsTo(models.Patient, { foreignKey: "patient_id", as: "Patient" });
      Appointment.hasOne(models.Feedback, { foreignKey: "appointment_id", as: "Feedback" });
      Appointment.hasOne(models.Prescription, { foreignKey: "appointment_id", as: "Prescription" });
      Appointment.hasOne(models.MedicalRecord, { foreignKey: "appointment_id", as: "MedicalRecord" });
      Appointment.hasOne(models.Payment, { foreignKey: "appointment_id", as: "Payments" });
      Appointment.belongsToMany(models.DoctorDayOff, {
        through: 'Day_off_appointments',
        foreignKey: 'appointment_id',
        otherKey: 'day_off_id',
        as: 'DoctorDayOffs'
      });
      Appointment.hasOne(models.CompensationCode, {
        foreignKey: 'appointment_id',
        as: 'CompensationCode'
      });
      Appointment.hasOne(models.CompensationCode, {
        foreignKey: 'used_appointment_id',
        as: 'UsedCompensationCode'
      });
    }
  }

  Appointment.init(
    {
      appointment_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        comment: 'ID của lịch hẹn'
      },
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Patients",
          key: "patient_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: 'ID của bệnh nhân'
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Doctors",
          key: "doctor_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: 'ID của bác sĩ'
      },
      appointment_datetime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Thời gian hẹn'
      },
      status: {
        type: DataTypes.ENUM(
          "waiting_for_confirmation", 
          "accepted", 
          "cancelled", 
          "completed", 
          "patient_not_coming",
          "doctor_day_off"
        ),
        allowNull: false,
        defaultValue: "waiting_for_confirmation",
        comment: 'Trạng thái của lịch hẹn'
      },
      fees: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Phí khám'
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời gian hủy lịch hẹn'
      },
      cancelled_by: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Người hủy lịch hẹn'
      },
      cancel_reason: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Lý do hủy lịch hẹn'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Ngày tạo'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Ngày cập nhật'
      }
    },
    {
      sequelize,
      modelName: "Appointment",
      tableName: "Appointments",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    }
  );

  return Appointment;
};
