'use strict';
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Schedules', {
      schedule_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Doctors',
          key: 'doctor_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      monday: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      tuesday: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      wednesday: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      thursday: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      friday: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      saturday: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      sunday: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Schedules');
  },
};
