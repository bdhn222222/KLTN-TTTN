'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // 1. Thêm cột createdAt và updatedAt vào bảng Compensation_codes
    await queryInterface.addColumn('Compensation_codes', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
      comment: 'Ngày tạo mã bồi thường'
    });

    await queryInterface.addColumn('Compensation_codes', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
      comment: 'Ngày cập nhật mã bồi thường'
    });
  },

  async down(queryInterface, Sequelize) {
    // 2. Xóa cột createdAt và updatedAt khỏi bảng Compensation_codes
    await queryInterface.removeColumn('Compensation_codes', 'createdAt');
    await queryInterface.removeColumn('Compensation_codes', 'updatedAt');
  }
};
