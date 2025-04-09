import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Doctor extends Model {
    static associate(models) {
      Doctor.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      Doctor.belongsTo(models.Specialization, {
        foreignKey: "specialization_id",
        as: "Specialization",
      });
      Doctor.hasMany(models.Appointment, {
        foreignKey: "doctor_id",
        as: "Appointments",
      });
      Doctor.hasOne(models.Schedule, {
        foreignKey: "doctor_id",
        as: "Schedule",
      });
      Doctor.hasMany(models.DoctorDayOff, {
        foreignKey: "doctor_id",
        as: "DayOffs",
      });
    }
  }

  Doctor.init(
    {
      doctor_id: {
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
      specialization_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Specializations",
          key: "specialization_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      degree: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      experience_years: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // fees: {
      //   type: DataTypes.INTEGER,
      //   allowNull: true,
      // },
      rating: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "Doctor",
      tableName: "Doctors",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return Doctor;
};
