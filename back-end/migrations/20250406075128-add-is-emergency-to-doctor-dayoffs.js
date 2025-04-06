export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('DoctorDayOffs', 'is_emergency', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Có phải là nghỉ khẩn cấp không'
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('DoctorDayOffs', 'is_emergency');
}; 