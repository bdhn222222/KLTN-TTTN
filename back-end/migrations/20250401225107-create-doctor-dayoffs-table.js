"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("DoctorDayOffs", {
    day_off_id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    doctor_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Doctors",
        key: "doctor_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    off_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    off_morning: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    off_afternoon: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    reason: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("DoctorDayOffs");
}
