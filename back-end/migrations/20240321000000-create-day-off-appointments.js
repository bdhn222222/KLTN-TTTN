import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("Day_off_appointments", {
    day_off_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "DoctorDayOffs",
        key: "day_off_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    appointment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Appointments",
        key: "appointment_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  // Thêm composite index cho cả hai khóa chính
  await queryInterface.addIndex(
    "Day_off_appointments",
    ["day_off_id", "appointment_id"],
    {
      unique: true,
      name: "day_off_appointments_composite_pk",
    }
  );
};

export const down = async (queryInterface) => {
  // Xóa bảng
  await queryInterface.dropTable("Day_off_appointments");
};
