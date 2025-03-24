import { Model, DataTypes } from "sequelize";
import bcrypt from "bcrypt";

export default (sequelize) => {
  class User extends Model {
    async checkPassword(password) {
      return await bcrypt.compare(password, this.password);
    }
    createJWT () {
      return jwt.sign(
        {
          user_id: this.user_id,
          username: this.username,
          email: this.email,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      )
    }
    static associate(models) {
    User.hasOne(models.Patient, { foreignKey: "user_id", as: "patient" });
    User.hasOne(models.Doctor, { foreignKey: "user_id", as: "doctor" });
    User.hasOne(models.Pharmacist, { foreignKey: "user_id", as: "pharmacist" });
    User.hasOne(models.Admin, { foreignKey: "user_id", as: "admin" });
    }
  }

  User.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3467.jpg",
      },
      role: {
        type: DataTypes.ENUM("patient", "doctor", "pharmacist", "admin"),
        allowNull: false,
        defaultValue: "patient",
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "Users",
      timestamps: true,
    }
  );

  User.beforeSave(async (user) => {
    if (user.changed("password")) {
      const value = user.password;

      if (value.length < 8 || value.length > 32) {
        throw new BadRequestError(
          "Password must be between 8 and 32 characters."
        );
      }

      const hasUppercase = /[A-Z]/.test(value);
      const hasLowercase = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+{}\[\]:;<>,.?\/\\|-]/.test(value);

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
        throw new BadRequestError(
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        );
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  return User;
};
