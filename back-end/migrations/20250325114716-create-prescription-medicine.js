'use strict';
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Prescription_medicines', {
      prescription_medicine_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      prescription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Prescriptions',
          key: 'prescription_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      medicine_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Medicines',
          key: 'medicine_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Prescription_medicines');
  },
};
