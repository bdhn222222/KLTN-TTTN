'use strict';
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Prescription_payments', {
      prescription_payment_id: {
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
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.ENUM('cash', 'credit_card', 'VNPay', 'MoMo', 'ZaloPay'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('paid', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Prescription_payments');
  },
};
