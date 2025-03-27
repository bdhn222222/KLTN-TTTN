export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("Prescriptions", "dispensed", {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await queryInterface.addColumn("Prescription_Medicines", "actual_quantity", {
    type: Sequelize.INTEGER,
    allowNull: true,
  });

  await queryInterface.addColumn("Prescription_Medicines", "note", {
    type: Sequelize.STRING,
    allowNull: true,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn("Prescriptions", "dispensed");
  await queryInterface.removeColumn(
    "Prescription_Medicines",
    "actual_quantity"
  );
  await queryInterface.removeColumn("Prescription_Medicines", "note");
}
