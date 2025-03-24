'use strict';
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('prescription_payments', {
      payment_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      prescription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'prescriptions',
          key: 'prescription_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: Sequelize.INT,
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.ENUM('cash', 'credit_card', 'VNPay', 'MoMo', 'ZaloPay'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('paid', 'pending'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('prescription_payments');
  },
};
