import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Thêm cột patient_id
      await queryInterface.addColumn(
        'Prescriptions',
        'patient_id',
        {
          type: DataTypes.INTEGER,
          allowNull: true, // Tạm thời cho phép null để migration không bị lỗi
          references: {
            model: 'Patients',
            key: 'patient_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction }
      );

      // 2. Cập nhật patient_id từ appointment
      await queryInterface.sequelize.query(`
        UPDATE Prescriptions p
        SET patient_id = (
          SELECT a.patient_id 
          FROM Appointments a 
          WHERE a.appointment_id = p.appointment_id
        )
        WHERE p.appointment_id IS NOT NULL;
      `, { transaction });

      // 3. Thay đổi patient_id thành NOT NULL sau khi đã cập nhật dữ liệu
      await queryInterface.changeColumn(
        'Prescriptions',
        'patient_id',
        {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'Patients',
            key: 'patient_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction }
      );

      // 4. Thay đổi appointment_id thành nullable
      await queryInterface.changeColumn(
        'Prescriptions',
        'appointment_id',
        {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'Appointments',
            key: 'appointment_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction }
      );

      // 5. Thêm index cho patient_id
      await queryInterface.addIndex(
        'Prescriptions',
        ['patient_id'],
        {
          name: 'idx_prescriptions_patient',
          transaction
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Xóa index
      await queryInterface.removeIndex(
        'Prescriptions',
        'idx_prescriptions_patient',
        { transaction }
      );

      // 2. Đổi appointment_id về NOT NULL
      await queryInterface.changeColumn(
        'Prescriptions',
        'appointment_id',
        {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'Appointments',
            key: 'appointment_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction }
      );

      // 3. Xóa cột patient_id
      await queryInterface.removeColumn(
        'Prescriptions',
        'patient_id',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}; 