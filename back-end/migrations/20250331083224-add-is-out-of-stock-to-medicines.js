export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("Medicines", "is_out_of_stock", {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn("Medicines", "is_out_of_stock");
}
