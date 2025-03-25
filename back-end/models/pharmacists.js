import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Pharmacist extends Model {
    static associate(models) {
      // Liên kết với bảng Users
      Pharmacist.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      Pharmacist.hasMany(models.Prescription, { foreignKey: "pharmacist_id", as: "prescriptions" });
    }
  }

  Pharmacist.init(
    {
      pharmacist_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      license_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Đảm bảo số giấy phép là duy nhất
      },
    },
    {
      sequelize,
      modelName: "Pharmacist",
      tableName: "Pharmacists",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return Pharmacist;
};
