import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Specialization extends Model {
    static associate(models) {
      // Liên kết với bảng Doctors
      Specialization.hasMany(models.Doctor, { foreignKey: "specialization_id", as: "doctors" });
  
    }
  }

  Specialization.init(
    {
      specialization_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "https://cdn1.youmed.vn/tin-tuc/wp-content/uploads/2023/05/yhocduphong.png",
      },
      fees: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Specialization",
      tableName: "Specializations",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );
  return Specialization;
};
