'use strict';

export async function up(queryInterface, Sequelize) {
  // Thêm giá trị 'doctor_day_off' vào ENUM 'status' trong bảng Appointments
  await queryInterface.changeColumn('Appointments', 'status', {
    type: Sequelize.ENUM(
      'waiting_for_confirmation',
      'accepted',
      'cancelled',
      'completed',
      'patient_not_coming',
      'doctor_day_off'  // Thêm giá trị 'doctor_day_off'
    ),
    allowNull: false,
    defaultValue: 'waiting_for_confirmation',  // Mặc định là 'waiting_for_confirmation'
  });
}

export async function down(queryInterface, Sequelize) {
  // Xóa giá trị 'doctor_day_off' khỏi ENUM 'status' trong bảng Appointments nếu rollback migration
  await queryInterface.changeColumn('Appointments', 'status', {
    type: Sequelize.ENUM(
      'waiting_for_confirmation',
      'accepted',
      'cancelled',
      'completed',
      'patient_not_coming'
    ),
    allowNull: false,
    defaultValue: 'waiting_for_confirmation',  // Mặc định là 'waiting_for_confirmation'
  });
}
