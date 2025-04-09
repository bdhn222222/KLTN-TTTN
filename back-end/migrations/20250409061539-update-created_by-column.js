
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.changeColumn('RetailPrescriptionPayments', 'created_by', {
    type: Sequelize.INTEGER,
    allowNull: false,  // Đảm bảo không cho phép NULL
    references: {
      model: 'Pharmacists',  // Nếu cần tham chiếu đến bảng Pharmacists
      key: 'pharmacist_id'
    },
    comment: 'Dược sĩ tạo đơn thanh toán'
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.changeColumn('RetailPrescriptionPayments', 'created_by', {
    type: Sequelize.INTEGER,
    allowNull: true,  // Khôi phục lại cho phép NULL
    comment: 'Dược sĩ tạo đơn thanh toán'
  });
};
