import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class DayOffAppointment extends Model {
    static associate(models) {
      // Không cần định nghĩa associations ở đây vì đã được định nghĩa ở DoctorDayOff và Appointment
    }
  }

  DayOffAppointment.init(
    {
      day_off_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'DoctorDayOffs',
          key: 'day_off_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'Appointments',
          key: 'appointment_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "Day_off_appointment",
      tableName: "Day_off_appointments",
      timestamps: true
    }
  );

  return DayOffAppointment;
}; 