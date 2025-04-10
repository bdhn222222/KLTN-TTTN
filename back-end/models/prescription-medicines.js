import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class PrescriptionMedicine extends Model {
    static associate(models) {
      // Liên kết với bảng Prescriptions
      PrescriptionMedicine.belongsTo(models.Prescription, {
        foreignKey: "prescription_id",
        as: "prescription",
      });
      PrescriptionMedicine.belongsTo(models.Medicine, {
        foreignKey: "medicine_id",
        as: "Medicine",
      });
    }
  }

  PrescriptionMedicine.init(
    {
      prescription_medicine_id: {
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
      medicine_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Medicines",
          key: "medicine_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      actual_quantity: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dosage: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Liều dùng (VD: 1 viên/lần)"
      },
      frequency: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Tần suất sử dụng (VD: 2 lần/ngày)"
      },
      duration: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Thời gian dùng thuốc (VD: 5 ngày)"
      },
      instructions: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "Hướng dẫn sử dụng"
      },
      unit_price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Đơn giá thuốc"
      },
      total_price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Thành tiền = số lượng * đơn giá"
      },
      note: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Prescription_medicine",
      tableName: "Prescription_medicines",
      timestamps: false,
    }
  );

  return PrescriptionMedicine;
};
