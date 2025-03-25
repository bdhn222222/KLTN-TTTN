import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Patient extends Model {
    static associate(models) {
      // Liên kết với User
      Patient.belongsTo(models.User, { foreignKey: "user_id", as: "user" });

      Patient.hasMany(models.Appointment, { foreignKey: "patient_id", as: "appointments" });
    }
  }

  Patient.init(
    {
      patient_id: {
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
      date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("male", "female", "other"),
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      insurance_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      id_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      otp_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      otp_expiry: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Patient",
      tableName: "Patients",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );
  return Patient;
};
