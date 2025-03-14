'use strict';
/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Appointments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      patient_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Patients',
          key: 'id'
        }
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Doctors',
          key: 'id'
        }
      },
      appointment_datetime: {
        type: Sequelize.DATE
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled')
      },
      rescheduled_to: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Appointments',
          key: 'id'
        },
        allowNull: true
      },
      reschedule_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      doctor_confirmed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.dropTable('Appointments');
  }
};