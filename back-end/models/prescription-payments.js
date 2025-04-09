import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class PrescriptionPayment extends Model {
    static associate(models) {
      // Liên kết với bảng Prescriptions
      PrescriptionPayment.belongsTo(models.Prescription, {
        foreignKey: "prescription_id",
        as: "prescription"
      });
    }
  }

  PrescriptionPayment.init(
    {
      prescription_payment_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      prescription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Prescriptions",
          key: "prescription_id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Số tiền thanh toán"
      },
      payment_method: {
        type: DataTypes.ENUM("cash", "ZaloPay"),
        allowNull: null,
        comment: "Trạng thái thanh toán: pending - chờ thanh toán, paid - đã thanh toán"
      },
      status: {
        type: DataTypes.ENUM("paid", "pending"),
        allowNull: false,
        defaultValue: "pending",
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Thời điểm thanh toán"
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "ID giao dịch (cho thanh toán online)"
      }
    },
    {
      sequelize,
      modelName: "Prescription_payment",
      tableName: "Prescription_payments",
      timestamps: false,
      indexes: [
        {
          name: 'idx_prescription_payments_prescription',
          fields: ['prescription_id']
        },
        {
          name: 'idx_prescription_payments_status',
          fields: ['status']
        },
        {
          name: 'idx_prescription_payments_method',
          fields: ['payment_method']
        }
      ]
    }
  );

  return PrescriptionPayment;
};
