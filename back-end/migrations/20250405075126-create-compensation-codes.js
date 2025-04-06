/** @type {import('sequelize').Migration} */
export async function up(queryInterface, Sequelize) {
    // Tạo bảng Compensation_codes
    await queryInterface.createTable('Compensation_codes', {
      compensation_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Appointments',
          key: 'appointment_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      patient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Patients',
          key: 'patient_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true, // Đảm bảo mã giảm giá là duy nhất
      },
      percent: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      is_used: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false, // Mặc định là chưa sử dụng
      },
      used_appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Appointments',
          key: 'appointment_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // Giữ lại mã giảm giá nếu lịch hẹn bị xóa
      },
      expiry_date: {
        type: Sequelize.DATE,
        allowNull: false,
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
  
    // Thêm chỉ mục cho các trường quan trọng
    await queryInterface.addIndex('Compensation_codes', ['patient_id']);
    await queryInterface.addIndex('Compensation_codes', ['code']);
    await queryInterface.addIndex('Compensation_codes', ['is_used']);
  }
  
  export async function down(queryInterface, Sequelize) {
    // Xóa bảng Compensation_codes nếu rollback migration
    await queryInterface.dropTable('Compensation_codes');
  }
  