import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Prescription extends Model {
    static associate(models) {
      // Liên kết với bảng Appointments
      Prescription.belongsTo(models.Appointment, { foreignKey: "appointment_id", as: "appointment" });
      Prescription.hasMany(models.PrescriptionMedicine, { foreignKey: "prescription_id", as: "prescriptionMedicines" });
      Prescription.hasMany(models.PrescriptionPayment, { foreignKey: "prescription_id", as: "prescriptionPayments" });
  }
  }

  Prescription.init(
    {
      prescription_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
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
      medicine_details: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Prescription",
      tableName: "Prescriptions",
      timestamps: true,
    }
  );

  return Prescription;
};
