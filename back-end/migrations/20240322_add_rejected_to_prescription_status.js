'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Không thêm giá trị 'rejected' vào ENUM, chỉ sử dụng 'cancelled'
    await queryInterface.sequelize.query(`
      ALTER TABLE Prescriptions 
      MODIFY COLUMN status ENUM('pending_prepare', 'waiting_payment', 'completed', 'cancelled') 
      NOT NULL DEFAULT 'pending_prepare' 
      COMMENT 'Trạng thái đơn thuốc: pending_prepare - chờ chuẩn bị, waiting_payment - chờ thanh toán, completed - hoàn tất, cancelled - đã hủy';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Khôi phục lại ENUM ban đầu
    await queryInterface.sequelize.query(`
      ALTER TABLE Prescriptions 
      MODIFY COLUMN status ENUM('pending_prepare', 'waiting_payment', 'completed', 'cancelled') 
      NOT NULL DEFAULT 'pending_prepare' 
      COMMENT 'Trạng thái đơn thuốc: pending_prepare - chờ chuẩn bị, waiting_payment - chờ thanh toán, completed - hoàn tất, cancelled - đã hủy';
    `);
  }
}; 