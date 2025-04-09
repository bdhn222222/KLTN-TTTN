'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // 1. Thêm các trường mới
    await queryInterface.addColumn('Prescriptions', 'status', {
      type: Sequelize.ENUM('pending_prepare', 'waiting_payment', 'completed', 'cancelled'),
      defaultValue: 'pending_prepare',
      allowNull: false,
      after: 'medicine_details',
      comment: "Trạng thái đơn thuốc: pending_prepare - chờ chuẩn bị, waiting_payment - chờ thanh toán, completed - hoàn tất, cancelled - đã hủy"
    });

    await queryInterface.addColumn('Prescriptions', 'confirmed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'status',
      comment: "Thời điểm dược sĩ xác nhận đã chuẩn bị xong"
    });

    await queryInterface.addColumn('Prescriptions', 'completed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'confirmed_at',
      comment: "Thời điểm hoàn tất đơn thuốc"
    });

    await queryInterface.addColumn('Prescriptions', 'cancelled_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'completed_at',
      comment: "Thời điểm hủy đơn thuốc"
    });

    await queryInterface.addColumn('Prescriptions', 'cancel_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'cancelled_at',
      comment: "Lý do hủy đơn thuốc"
    });

    await queryInterface.addColumn('Prescriptions', 'pdf_url', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'cancel_reason',
      comment: "Đường dẫn file PDF đơn thuốc"
    });

    await queryInterface.addColumn('Prescriptions', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });

    // 2. Chuyển đổi dữ liệu từ dispensed sang status
    await queryInterface.sequelize.query(`
      UPDATE Prescriptions 
      SET status = CASE 
        WHEN dispensed = true THEN 'completed'
        ELSE 'pending_prepare'
      END
    `);

    // 3. Xóa cột dispensed sau khi đã chuyển đổi dữ liệu
    await queryInterface.removeColumn('Prescriptions', 'dispensed');

    // 4. Thêm các indexes
    await queryInterface.addIndex('Prescriptions', ['status'], {
      name: 'idx_prescriptions_status'
    });

    await queryInterface.addIndex('Prescriptions', ['pharmacist_id'], {
      name: 'idx_prescriptions_pharmacist'
    });

    await queryInterface.addIndex('Prescriptions', ['appointment_id'], {
      name: 'idx_prescriptions_appointment'
    });
  },

  async down(queryInterface, Sequelize) {
    // 1. Xóa các indexes
    await queryInterface.removeIndex('Prescriptions', 'idx_prescriptions_status');
    await queryInterface.removeIndex('Prescriptions', 'idx_prescriptions_pharmacist');
    await queryInterface.removeIndex('Prescriptions', 'idx_prescriptions_appointment');

    // 2. Thêm lại cột dispensed
    await queryInterface.addColumn('Prescriptions', 'dispensed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: "Trạng thái phát thuốc: true - đã phát thuốc, false - chưa phát thuốc"
    });

    // 3. Chuyển đổi dữ liệu ngược lại
    await queryInterface.sequelize.query(`
      UPDATE Prescriptions 
      SET dispensed = CASE 
        WHEN status = 'completed' THEN true
        ELSE false
      END
    `);

    // 4. Xóa các cột mới
    await queryInterface.removeColumn('Prescriptions', 'pdf_url');
    await queryInterface.removeColumn('Prescriptions', 'cancel_reason');
    await queryInterface.removeColumn('Prescriptions', 'cancelled_at');
    await queryInterface.removeColumn('Prescriptions', 'completed_at');
    await queryInterface.removeColumn('Prescriptions', 'confirmed_at');
    await queryInterface.removeColumn('Prescriptions', 'status');
    await queryInterface.removeColumn('Prescriptions', 'updatedAt');

    // 5. Xóa ENUM type
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_Prescriptions_status;`);
  }
}; 