/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('Appointments', 'cancelled_at', {
    type: Sequelize.DATE,
    allowNull: true,
  });
  await queryInterface.addColumn('Appointments', 'cancelled_by', {
    type: Sequelize.STRING,
    allowNull: true,
  });
  await queryInterface.addColumn('Appointments', 'cancel_reason', {
    type: Sequelize.STRING,
    allowNull: true,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('Appointments', 'cancelled_at');
  await queryInterface.removeColumn('Appointments', 'cancelled_by');
  await queryInterface.removeColumn('Appointments', 'cancel_reason');
}
