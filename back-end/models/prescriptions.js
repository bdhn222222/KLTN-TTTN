import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Prescription extends Model {
    static associate(models) {
      // Liên kết với bảng Appointments
      Prescription.belongsTo(models.Appointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      // Liên kết với bảng PrescriptionMedicine (chi tiết đơn thuốc)
      Prescription.hasMany(models.PrescriptionMedicine, {
        foreignKey: "prescription_id",
        as: "prescriptionMedicines",
      });
      // Liên kết với bảng PrescriptionPayment (thanh toán đơn thuốc)
      Prescription.hasOne(models.PrescriptionPayment, {
        foreignKey: "prescription_id",
        as: "prescriptionPayments",
      });
      // Liên kết với bảng Pharmacist (dược sĩ phát thuốc)
      Prescription.belongsTo(models.Pharmacist, {
        foreignKey: "pharmacist_id",
        as: "pharmacist",
      });
    }
  }

  Prescription.init(
    {
      prescription_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        comment: "ID đơn thuốc, tự động tăng"
      },
      pharmacist_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Pharmacists",
          key: "pharmacist_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "ID dược sĩ xác nhận phát thuốc, có thể null khi chưa phát thuốc"
      },
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Appointments",
          key: "appointment_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "ID cuộc hẹn liên quan đến đơn thuốc này"
      },
      dispensed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Trạng thái phát thuốc: true - đã phát thuốc, false - chưa phát thuốc"
      },
      medicine_details: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Ghi chú thêm về đơn thuốc (nếu có)"
      }
    },
    {
      sequelize,
      modelName: "Prescription",
      tableName: "Prescriptions",
      timestamps: true,
      createdAt: "createdAt", // Thời gian tạo đơn thuốc
      updatedAt: false,
    }
  );

  return Prescription;
};
