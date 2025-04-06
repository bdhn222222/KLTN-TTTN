/** @type {import('sequelize').Migration} */
export async function up(queryInterface, Sequelize) {
  // 1. Thêm trường compensation_code vào bảng Appointments
  await queryInterface.addColumn('Appointments', 'compensation_code', {
    type: Sequelize.STRING(20),
    allowNull: true,
    comment: 'Mã giảm giá áp dụng cho lịch hẹn'
  });

  // 2. Thêm trường compensation_amount vào bảng Payments
  await queryInterface.addColumn('Payments', 'compensation_amount', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Số tiền giảm giá nếu có'
  });
}

export async function down(queryInterface, Sequelize) {
  // 1. Xóa trường compensation_code khỏi bảng Appointments
  await queryInterface.removeColumn('Appointments', 'compensation_code');

  // 2. Xóa trường compensation_amount khỏi bảng Payments
  await queryInterface.removeColumn('Payments', 'compensation_amount');
}
