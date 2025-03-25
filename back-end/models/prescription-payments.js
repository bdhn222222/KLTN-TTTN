import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class PrescriptionPayment extends Model {
    static associate(models) {
      // Liên kết với bảng Prescriptions
      PrescriptionPayment.belongsTo(models.Prescription, { foreignKey: "prescription_id", as: "prescription" });
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
          key: "prescription_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.ENUM("cash", "credit_card", "VNPay", "MoMo", "ZaloPay"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("paid", "pending"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      sequelize,
      modelName: "Prescription_payment",
      tableName: "Prescription_payments",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false
    }
  );

  return PrescriptionPayment;
};
