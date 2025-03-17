import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Schedule extends Model {
    static associate(models) {
      // Liên kết với bảng Doctors
      Schedule.belongsTo(models.Doctor, { foreignKey: "doctor_id", as: "doctor" });
    }
  }

  Schedule.init(
    {
      schedule_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Doctors",
          key: "doctor_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      monday: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      tuesday: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      wednesday: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      thursday: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      friday: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      saturday: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      sunday: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Schedule",
      tableName: "schedules",
      timestamps: true,
    }
  );

  return Schedule;
};
