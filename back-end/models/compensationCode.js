import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
class CompensationCode extends Model {
  static associate(models) {
    CompensationCode.belongsTo(models.Appointment, {
      foreignKey: 'appointment_id',
      as: 'Appointment'
    });
    CompensationCode.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'Patient'
    });
    CompensationCode.belongsTo(models.Doctor, {
      foreignKey: 'doctor_id',
      as: 'Doctor'
    });
    CompensationCode.belongsTo(models.Appointment, {
      foreignKey: 'used_appointment_id',
      as: 'UsedAppointment'
    });
  }
}

CompensationCode.init(
  {
    compensation_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      comment: 'ID của mã bồi thường'
    },
    appointment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Appointments',
        key: 'appointment_id'
      },
      comment: 'ID của lịch hẹn bị hủy'
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Patients',
        key: 'patient_id'
      },
      comment: 'ID của bệnh nhân được nhận mã bồi thường'
    },
    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Doctors',
        key: 'doctor_id'
      },
      comment: 'ID của bác sĩ tạo mã bồi thường'
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Mã bồi thường duy nhất'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Số tiền bồi thường'
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10.00,
      comment: 'Phần trăm giảm giá của mã bồi thường'
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Trạng thái sử dụng của mã bồi thường'
    },
    used_appointment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Appointments',
        key: 'appointment_id'
      },
      comment: 'ID của lịch hẹn đã sử dụng mã bồi thường'
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Ngày hết hạn của mã bồi thường (6 tháng kể từ ngày tạo)'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Ngày tạo mã bồi thường'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Ngày cập nhật mã bồi thường'
    }
  },
  {
    sequelize,
    modelName: 'CompensationCode',
    tableName: 'Compensation_codes',
    timestamps: true,
    underscored: true
  }
);

return CompensationCode; 
}