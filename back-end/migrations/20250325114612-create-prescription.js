"use strict";
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Prescriptions", {
      prescription_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      pharmacist_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Pharmacists",
          key: "pharmacist_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Appointments",
          key: "appointment_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      medicine_details: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      dispensed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Prescriptions");
  },
};
