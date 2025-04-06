'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // 1. Xóa bảng trung gian day_off_appointments trước
    await queryInterface.dropTable('day_off_appointments');

    // 2. Xóa bảng DoctorDayOffs
    await queryInterface.dropTable('DoctorDayOffs');
  },

  async down(queryInterface, Sequelize) {
    // 1. Tạo lại bảng DoctorDayOffs
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      is_emergency: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Có phải là nghỉ khẩn cấp không'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      }
    });

    // 2. Tạo lại bảng trung gian day_off_appointments
    await queryInterface.createTable('day_off_appointments', {
      day_off_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'DoctorDayOffs',
          key: 'day_off_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Appointments',
          key: 'appointment_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // 3. Thêm các ràng buộc khóa chính cho bảng trung gian
    await queryInterface.addConstraint('day_off_appointments', {
      fields: ['day_off_id', 'appointment_id'],
      type: 'primary key',
      name: 'day_off_appointments_pkey'
    });
  }
}; 