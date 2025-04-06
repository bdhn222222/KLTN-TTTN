const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class MedicalRecord extends Model {}

MedicalRecord.init({
  record_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: 'ID của hồ sơ bệnh án'
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID của lịch hẹn liên quan'
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Chẩn đoán của bác sĩ'
  },
  treatment: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Phương pháp điều trị'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Ghi chú thêm'
  },
  is_visible_to_patient: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Bệnh nhân có thể xem hay không'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời điểm bác sĩ hoàn thành hồ sơ'
  },
  completed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID bác sĩ hoàn thành hồ sơ'
  },
  viewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Thời điểm bệnh nhân xem hồ sơ'
  }
}, {
  sequelize,
  modelName: 'MedicalRecord',
  tableName: 'Medical_records',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['appointment_id']
    },
    {
      fields: ['completed_by']
    }
  ]
});

module.exports = MedicalRecord; 