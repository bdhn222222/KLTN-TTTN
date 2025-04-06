'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Thêm cột amount
    await queryInterface.addColumn('Compensation_codes', 'amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Số tiền bồi thường'
    });

    // Thêm cột discount_percentage
    await queryInterface.addColumn('Compensation_codes', 'discount_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      after: 'amount',
      comment: 'Phần trăm giảm giá của mã bồi thường'
    });
  },

  async down(queryInterface, Sequelize) {
    // Xóa cột discount_percentage
    await queryInterface.removeColumn('Compensation_codes', 'discount_percentage');

    // Xóa cột amount
    await queryInterface.removeColumn('Compensation_codes', 'amount');
  }
}; 