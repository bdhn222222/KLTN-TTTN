'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Thêm cột is_visible_to_patient
    await queryInterface.addColumn('Medical_records', 'is_visible_to_patient', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Bệnh nhân có thể xem hay không'
    });

    // Thêm cột completed_at
    await queryInterface.addColumn('Medical_records', 'completed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm bác sĩ hoàn thành hồ sơ'
    });

    // Thêm cột completed_by
    await queryInterface.addColumn('Medical_records', 'completed_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID bác sĩ hoàn thành hồ sơ'
    });

    // Thêm cột viewed_at
    await queryInterface.addColumn('Medical_records', 'viewed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Thời điểm bệnh nhân xem hồ sơ'
    });

    // Thêm index cho completed_by
    await queryInterface.addIndex('Medical_records', ['completed_by'], {
      name: 'idx_medical_records_completed_by'
    });
  },

  async down(queryInterface, Sequelize) {
    // Xóa index
    await queryInterface.removeIndex('Medical_records', 'idx_medical_records_completed_by');

    // Xóa các cột
    await queryInterface.removeColumn('Medical_records', 'viewed_at');
    await queryInterface.removeColumn('Medical_records', 'completed_by');
    await queryInterface.removeColumn('Medical_records', 'completed_at');
    await queryInterface.removeColumn('Medical_records', 'is_visible_to_patient');
    // Xóa ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_Medical_records_status;');
  }
}; 