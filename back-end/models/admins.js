import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Admin extends Model {
    static associate(models) {
      // Liên kết với bảng Users
      Admin.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }

  Admin.init(
    {
      admin_id: {
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
    },
    {
      sequelize,
      modelName: "Admin",
      tableName: "Admins",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return Admin;
};
