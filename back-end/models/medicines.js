import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Medicine extends Model {
    static associate(models) {
      Medicine.hasMany(models.PrescriptionMedicine, {
        foreignKey: "medicine_id",
        as: "prescriptionMedicines",
      });
    }
  }

  Medicine.init(
    {
      medicine_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // quantity: {
      //   type: DataTypes.INTEGER,
      //   allowNull: false,
      //   defaultValue: 0,
      // },
      is_out_of_stock: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // expiry_date: {
      //   type: DataTypes.DATE,
      //   allowNull: false,
      // },
      supplier: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Medicine",
      tableName: "Medicines",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return Medicine;
};
