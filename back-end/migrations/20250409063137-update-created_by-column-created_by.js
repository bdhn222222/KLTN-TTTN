module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('RetailPrescriptionPayments', 'created_by', {
      type: Sequelize.INTEGER,
      allowNull: false,  // Không cho phép null
      references: {
        model: 'Pharmacists',
        key: 'pharmacist_id'
      },
      comment: 'Dược sĩ tạo đơn thanh toán'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('RetailPrescriptionPayments', 'created_by', {
      type: Sequelize.INTEGER,
      allowNull: true,  // Cho phép null trong trường hợp rollback
      comment: 'Dược sĩ tạo đơn thanh toán'
    });
  }
};
