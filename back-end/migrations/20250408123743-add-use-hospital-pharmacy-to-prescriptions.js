'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Prescriptions', 'use_hospital_pharmacy', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      after: 'pdf_url'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Prescriptions', 'use_hospital_pharmacy');
  }
};
