'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // 1. Kiểm tra và thêm các trường mới nếu chưa tồn tại
    const tableInfo = await queryInterface.describeTable('Prescription_payments');
    
    if (!tableInfo.payment_date) {
      await queryInterface.addColumn('Prescription_payments', 'payment_date', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Thời điểm thanh toán"
      });
    }

    if (!tableInfo.transaction_id) {
      await queryInterface.addColumn('Prescription_payments', 'transaction_id', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "ID giao dịch (cho thanh toán online)"
      });
    }

    // 2. Cập nhật ENUM của payment_method để chỉ giữ 4 giá trị
    // Sử dụng cách khác để thay đổi ENUM trong MySQL
    await queryInterface.sequelize.query(`
      ALTER TABLE Prescription_payments 
      MODIFY COLUMN payment_method ENUM('cash', 'credit_card', 'VNPay', 'ZaloPay') NOT NULL 
      COMMENT 'Phương thức thanh toán: cash - tiền mặt, credit_card - thẻ tín dụng, VNPay - thanh toán qua VNPay, ZaloPay - thanh toán qua ZaloPay';
    `);

    // 3. Kiểm tra và thêm các indexes nếu chưa tồn tại
    const indexes = await queryInterface.sequelize.query(
      `SHOW INDEX FROM Prescription_payments WHERE Key_name = 'idx_prescription_payments_prescription'`
    );
    
    if (indexes[0].length === 0) {
      await queryInterface.addIndex('Prescription_payments', ['prescription_id'], {
        name: 'idx_prescription_payments_prescription'
      });
    }

    const statusIndexes = await queryInterface.sequelize.query(
      `SHOW INDEX FROM Prescription_payments WHERE Key_name = 'idx_prescription_payments_status'`
    );
    
    if (statusIndexes[0].length === 0) {
      await queryInterface.addIndex('Prescription_payments', ['status'], {
        name: 'idx_prescription_payments_status'
      });
    }

    const methodIndexes = await queryInterface.sequelize.query(
      `SHOW INDEX FROM Prescription_payments WHERE Key_name = 'idx_prescription_payments_method'`
    );
    
    if (methodIndexes[0].length === 0) {
      await queryInterface.addIndex('Prescription_payments', ['payment_method'], {
        name: 'idx_prescription_payments_method'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // 1. Xóa các indexes nếu tồn tại
    try {
      await queryInterface.removeIndex('Prescription_payments', 'idx_prescription_payments_prescription');
    } catch (error) {
      console.log('Index idx_prescription_payments_prescription không tồn tại hoặc đã bị xóa');
    }

    try {
      await queryInterface.removeIndex('Prescription_payments', 'idx_prescription_payments_status');
    } catch (error) {
      console.log('Index idx_prescription_payments_status không tồn tại hoặc đã bị xóa');
    }

    try {
      await queryInterface.removeIndex('Prescription_payments', 'idx_prescription_payments_method');
    } catch (error) {
      console.log('Index idx_prescription_payments_method không tồn tại hoặc đã bị xóa');
    }

    // 2. Cập nhật ENUM của payment_method về giá trị cũ
    await queryInterface.sequelize.query(`
      ALTER TABLE Prescription_payments 
      MODIFY COLUMN payment_method ENUM('cash', 'credit_card', 'VNPay', 'MoMo', 'ZaloPay') NOT NULL 
      COMMENT 'Trạng thái thanh toán: pending - chờ thanh toán, paid - đã thanh toán';
    `);

    // 3. Xóa các cột mới nếu tồn tại
    const tableInfo = await queryInterface.describeTable('Prescription_payments');
    
    if (tableInfo.transaction_id) {
      await queryInterface.removeColumn('Prescription_payments', 'transaction_id');
    }

    if (tableInfo.payment_date) {
      await queryInterface.removeColumn('Prescription_payments', 'payment_date');
    }
  }
};