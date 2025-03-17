'use strict';
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Appointments", {
      appointment_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      patient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Patients", // Liên kết đến bảng patients
          key: "patient_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Doctors", // Liên kết đến bảng doctors
          key: "doctor_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      appointment_datetime: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("waiting_for_confirmation", "accepted", "cancelled", "completed", "rescheduled"),
        allowNull: false,
        defaultValue: "waiting_for_confirmation",
      },
      rescheduled_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Appointments",
          key: "appointment_id",
        },
        onUpdate: "SET NULL",
        onDelete: "SET NULL",
      },
      reschedule_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Appointments");
  },
};
