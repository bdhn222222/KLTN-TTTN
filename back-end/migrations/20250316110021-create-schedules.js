'use strict';
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('schedules', {
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
          model: 'doctors',
          key: 'doctor_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      monday: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      tuesday: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      wednesday: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      thursday: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      friday: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      saturday: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      sunday: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('schedules');
  },
};
