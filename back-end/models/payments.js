import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Payment extends Model {
    static associate(models) {
      // Liên kết với bảng Appointments
      Payment.belongsTo(models.Appointment, { foreignKey: "appointment_id", as: "appointment" });
    }
  }

  Payment.init(
    {
      payment_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
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
      },
      amount: {
        type: DataTypes.DECIMAL(10,3),
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.ENUM("cash", "credit_card", "VNPay", "MoMo", "ZaloPay"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("paid", "pending", "cancel"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      sequelize,
      modelName: "Payment",
      tableName: "Payments",
      timestamps: true,
    }
  );

  return Payment;
};
