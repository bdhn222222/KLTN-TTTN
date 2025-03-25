import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class MedicalRecord extends Model {
    static associate(models) {
      // Liên kết với bảng Appointments
      MedicalRecord.belongsTo(models.Appointment, { foreignKey: "appointment_id", as: "appointment" });
    }
  }

  MedicalRecord.init(
    {
      record_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Appointments",
          key: "appointment_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      diagnosis: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      treatment: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Medical_record",
      tableName: "Medical_records",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  return MedicalRecord;
};
