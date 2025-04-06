export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable('day_off_appointments', 'Day_off_appointments');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameTable('Day_off_appointments', 'day_off_appointments');
  }
}; 