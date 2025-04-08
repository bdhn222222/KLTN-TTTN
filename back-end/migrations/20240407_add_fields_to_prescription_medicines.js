export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('Prescription_medicines', 'dosage', {
    type: Sequelize.STRING(100),
    allowNull: true,
    comment: "Liều dùng (VD: 1 viên/lần)"
  });

  await queryInterface.addColumn('Prescription_medicines', 'frequency', {
    type: Sequelize.STRING(100),
    allowNull: true,
    comment: "Tần suất sử dụng (VD: 2 lần/ngày)"
  });

  await queryInterface.addColumn('Prescription_medicines', 'duration', {
    type: Sequelize.STRING(100),
    allowNull: true,
    comment: "Thời gian dùng thuốc (VD: 5 ngày)"
  });

  await queryInterface.addColumn('Prescription_medicines', 'instructions', {
    type: Sequelize.STRING(255),
    allowNull: true,
    comment: "Hướng dẫn sử dụng"
  });

  await queryInterface.addColumn('Prescription_medicines', 'unit_price', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: "Đơn giá thuốc"
  });

  await queryInterface.addColumn('Prescription_medicines', 'total_price', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: "Thành tiền = số lượng * đơn giá"
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('Prescription_medicines', 'dosage');
  await queryInterface.removeColumn('Prescription_medicines', 'frequency');
  await queryInterface.removeColumn('Prescription_medicines', 'duration');
  await queryInterface.removeColumn('Prescription_medicines', 'instructions');
  await queryInterface.removeColumn('Prescription_medicines', 'unit_price');
  await queryInterface.removeColumn('Prescription_medicines', 'total_price');
} 