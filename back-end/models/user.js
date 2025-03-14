import { Model, DataTypes } from "sequelize";
import bcrypt from "bcrypt";

export default (sequelize) => {
  class User extends Model {
    async checkPassword(password) {
      return await bcrypt.compare(password, this.password);
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("patient", "doctor", "pharmacist", "admin"),
        allowNull: false,
      },
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      hooks: {
        beforeCreate: async (user) => {
          user.password = await bcrypt.hash(user.password, 10);
        },
      },
    }
  );

  return User;
};
