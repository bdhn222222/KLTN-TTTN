'use strict';
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Prescription_medicines", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      prescription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Prescriptions", // Liên kết đến bảng prescriptions
          key: "prescription_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      medicine_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Medicines", // Liên kết đến bảng medicines
          key: "medicine_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1, // Đơn thuốc phải có ít nhất 1 đơn vị thuốc
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Prescription_medicines");
  },
};
