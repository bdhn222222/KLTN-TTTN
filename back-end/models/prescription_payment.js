'use strict';
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Prescription_payment extends Model {
    static associate(models) {
      // define association here
      this.belongsTo(models.Prescription, {
        foreignKey: 'prescription_id',
        as: 'prescription'
      });

      this.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });

      this.belongsTo(models.User, {
        foreignKey: 'updated_by',
        as: 'updater'
      });
    }
  }
  
  Prescription_payment.init({
    prescription_payment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "ID thanh toán đơn thuốc"
    },
    prescription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Prescriptions',
        key: 'prescription_id'
      },
      comment: "ID đơn thuốc"
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Số tiền cần thanh toán"
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'zalopay'),
      allowNull: true,
      comment: "Phương thức thanh toán: cash - tiền mặt, zalopay - thanh toán qua ZaloPay, null - chưa chọn phương thức"
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: "Trạng thái thanh toán: pending - chờ thanh toán, paid - đã thanh toán, cancelled - đã hủy"
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Thời điểm thanh toán"
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Ghi chú thanh toán"
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'user_id'
      },
      comment: "ID người tạo (dược sĩ xác nhận chuẩn bị thuốc)"
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'user_id'
      },
      comment: "ID người cập nhật (dược sĩ xác nhận thanh toán)"
    }
  }, {
    sequelize,
    modelName: 'Prescription_payment',
    tableName: 'Prescription_payments',
    timestamps: true,
    comment: "Bảng lưu thông tin thanh toán đơn thuốc"
  });
  
  return Prescription_payment;
}; 