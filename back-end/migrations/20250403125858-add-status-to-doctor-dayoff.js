'use strict';

export async function up(queryInterface, Sequelize) {
  // Thêm cột status vào bảng DoctorDayOffs
  await queryInterface.addColumn("DoctorDayOffs", "status", {
    type: Sequelize.ENUM("active", "cancelled"),
    defaultValue: "active",  // Mặc định là active khi đăng ký ngày nghỉ
    allowNull: false,
  });
}

export async function down(queryInterface, Sequelize) {
  // Xóa cột status nếu rollback migration
  await queryInterface.removeColumn("DoctorDayOffs", "status");
}
