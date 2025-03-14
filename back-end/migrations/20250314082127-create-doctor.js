'use strict';
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Doctors', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      specialization_id: {
        type: Sequelize.INTEGER
      },
      license_number: {
        type: Sequelize.STRING
      },
      work_schedule: {
        type: Sequelize.JSON
      },
      experience_years: {
        type: Sequelize.INTEGER
      },
      description: {
        type: Sequelize.TEXT
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Doctors');
  }
};