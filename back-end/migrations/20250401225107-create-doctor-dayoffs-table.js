"use strict";

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('DoctorDayOffs', {
    day_off_id: {
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
        key: 'doctor_id'
      },
    },
    off_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: 'Ngày nghỉ'
    },
    off_morning: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Nghỉ buổi sáng'
    },
    off_afternoon: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Nghỉ buổi chiều'
    },
    status: {
      type: Sequelize.ENUM("active", "cancelled"),
      allowNull: false,
      defaultValue: "active",
      comment: 'Trạng thái của ngày nghỉ'
    },
    reason: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Lý do nghỉ'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
    }
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('DoctorDayOffs');
};
