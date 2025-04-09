import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Prescription extends Model {
    static associate(models) {
      // Liên kết với bảng Appointments
      Prescription.belongsTo(models.Appointment, {
        foreignKey: "appointment_id",
        as: "Appointment",
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
      // Liên kết với bảng Patient
      Prescription.belongsTo(models.Patient, {
        foreignKey: "patient_id",
        as: "patient",
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
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Patients",
          key: "patient_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "ID bệnh nhân của đơn thuốc"
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
        allowNull: false, // Cho phép null vì đơn thuốc bán lẻ không có cuộc hẹn
        references: {
          model: "Appointments",
          key: "appointment_id",
        },
        defaultValue: null,
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "ID cuộc hẹn liên quan đến đơn thuốc này (null nếu là đơn bán lẻ)"
      },
      status: {
        type: DataTypes.ENUM('pending_prepare', 'waiting_payment', 'completed', 'cancelled', 'rejected'),
        defaultValue: 'pending_prepare',
        allowNull: false,
        comment: "Trạng thái đơn thuốc: pending_prepare - chờ chuẩn bị, waiting_payment - chờ thanh toán, completed - hoàn tất, cancelled - đã hủy, rejected - đã từ chối"
      },
      medicine_details: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Ghi chú thêm về đơn thuốc (nếu có)"
      },
      confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Thời điểm dược sĩ xác nhận đã chuẩn bị xong"
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Thời điểm hoàn tất đơn thuốc"
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Thời điểm hủy đơn thuốc"
      },
      cancel_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Lý do hủy đơn thuốc"
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Lý do từ chối đơn thuốc"
      },
      rejected_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Thời điểm từ chối đơn thuốc"
      },
      rejected_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Pharmacists",
          key: "pharmacist_id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "ID dược sĩ từ chối đơn thuốc"
      },
      pdf_url: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Đường dẫn file PDF đơn thuốc"
      },
      use_hospital_pharmacy: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Xác định bệnh nhân có lấy thuốc tại nhà thuốc bệnh viện hay không"
      }
    },
    {
      sequelize,
      modelName: "Prescription",
      tableName: "Prescriptions",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      indexes: [
        {
          name: 'idx_prescriptions_status',
          fields: ['status']
        },
        {
          name: 'idx_prescriptions_pharmacist',
          fields: ['pharmacist_id']
        },
        {
          name: 'idx_prescriptions_appointment',
          fields: ['appointment_id']
        },
        {
          name: 'idx_prescriptions_patient',
          fields: ['patient_id']
        }
      ]
    }
  );

  return Prescription;
};
