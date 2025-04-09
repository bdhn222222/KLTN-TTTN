'use strict';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Update RetailPrescriptions table
      // 1. Change status enum values
      await queryInterface.changeColumn('RetailPrescriptions', 'status', {
        type: Sequelize.ENUM('pending_prepare', 'waiting_payment', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending_prepare'
      }, { transaction });

      // 2. Check if medicine_details column already exists
      const tableInfo = await queryInterface.describeTable('RetailPrescriptions');
      
      // Only proceed with renaming if medicine_details doesn't exist and notes does
      if (!tableInfo.medicine_details && tableInfo.notes) {
        // Rename notes to medicine_details
        await queryInterface.renameColumn('RetailPrescriptions', 'notes', 'medicine_details', { transaction });
      } else if (!tableInfo.medicine_details && !tableInfo.notes) {
        // Add medicine_details column if neither exists
        await queryInterface.addColumn('RetailPrescriptions', 'medicine_details', {
          type: Sequelize.TEXT,
          allowNull: true
        }, { transaction });
      }
      // If medicine_details already exists, do nothing

      // 3. Add new columns - check if they exist first
      if (!tableInfo.confirmed_at) {
        await queryInterface.addColumn('RetailPrescriptions', 'confirmed_at', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.completed_at) {
        await queryInterface.addColumn('RetailPrescriptions', 'completed_at', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.cancelled_at) {
        await queryInterface.addColumn('RetailPrescriptions', 'cancelled_at', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.cancelled_reason) {
        await queryInterface.addColumn('RetailPrescriptions', 'cancelled_reason', {
          type: Sequelize.TEXT,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.cancelled_by) {
        await queryInterface.addColumn('RetailPrescriptions', 'cancelled_by', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Pharmacists',
            key: 'pharmacist_id'
          }
        }, { transaction });
      }

      // Update RetailPrescriptionMedicines table
      const medicineTableInfo = await queryInterface.describeTable('RetailPrescriptionMedicines');
      
      // 1. Add new columns - check if they exist first
      if (!medicineTableInfo.actual_quantity) {
        await queryInterface.addColumn('RetailPrescriptionMedicines', 'actual_quantity', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      }

      if (!medicineTableInfo.unit_price) {
        await queryInterface.addColumn('RetailPrescriptionMedicines', 'unit_price', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        }, { transaction });
      }

      if (!medicineTableInfo.total_price) {
        await queryInterface.addColumn('RetailPrescriptionMedicines', 'total_price', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        }, { transaction });
      }

      // 2. Check if instructions column already exists
      // Only proceed with renaming if instructions doesn't exist and notes does
      if (!medicineTableInfo.instructions && medicineTableInfo.notes) {
        // Rename notes to instructions
        await queryInterface.renameColumn('RetailPrescriptionMedicines', 'notes', 'instructions', { transaction });
      } else if (!medicineTableInfo.instructions && !medicineTableInfo.notes) {
        // Add instructions column if neither exists
        await queryInterface.addColumn('RetailPrescriptionMedicines', 'instructions', {
          type: Sequelize.TEXT,
          allowNull: true
        }, { transaction });
      }
      // If instructions already exists, do nothing

      // 3. Make dosage, frequency, duration nullable
      await queryInterface.changeColumn('RetailPrescriptionMedicines', 'dosage', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('RetailPrescriptionMedicines', 'frequency', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('RetailPrescriptionMedicines', 'duration', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      // 4. Add default value for quantity
      await queryInterface.changeColumn('RetailPrescriptionMedicines', 'quantity', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction });

      // Update RetailPrescriptionPayments table
      const paymentTableInfo = await queryInterface.describeTable('RetailPrescriptionPayments');
      
      // 1. Change payment_method enum values
      await queryInterface.changeColumn('RetailPrescriptionPayments', 'payment_method', {
        type: Sequelize.ENUM('cash', 'zalopay'),
        allowNull: false
      }, { transaction });

      // 2. Add new columns - check if they exist first
      if (!paymentTableInfo.created_by) {
        await queryInterface.addColumn('RetailPrescriptionPayments', 'created_by', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Pharmacists',
            key: 'pharmacist_id'
          }
        }, { transaction });
      } else {
        // If the column exists but is not nullable, modify it to be nullable
        await queryInterface.changeColumn('RetailPrescriptionPayments', 'created_by', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Pharmacists',
            key: 'pharmacist_id'
          }
        }, { transaction });
      }

      if (!paymentTableInfo.updated_by) {
        await queryInterface.addColumn('RetailPrescriptionPayments', 'updated_by', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Pharmacists',
            key: 'pharmacist_id'
          }
        }, { transaction });
      } else {
        // If the column exists but is not nullable, modify it to be nullable
        await queryInterface.changeColumn('RetailPrescriptionPayments', 'updated_by', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Pharmacists',
            key: 'pharmacist_id'
          }
        }, { transaction });
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Revert RetailPrescriptions table changes
      // 1. Change status enum values back
      await queryInterface.changeColumn('RetailPrescriptions', 'status', {
        type: Sequelize.ENUM('pending', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      }, { transaction });

      // 2. Rename medicine_details back to notes
      await queryInterface.renameColumn('RetailPrescriptions', 'medicine_details', 'notes', { transaction });

      // 3. Remove added columns
      await queryInterface.removeColumn('RetailPrescriptions', 'confirmed_at', { transaction });
      await queryInterface.removeColumn('RetailPrescriptions', 'completed_at', { transaction });
      await queryInterface.removeColumn('RetailPrescriptions', 'cancelled_at', { transaction });
      await queryInterface.removeColumn('RetailPrescriptions', 'cancelled_reason', { transaction });
      await queryInterface.removeColumn('RetailPrescriptions', 'cancelled_by', { transaction });

      // Revert RetailPrescriptionMedicines table changes
      // 1. Remove added columns
      await queryInterface.removeColumn('RetailPrescriptionMedicines', 'actual_quantity', { transaction });
      await queryInterface.removeColumn('RetailPrescriptionMedicines', 'unit_price', { transaction });
      await queryInterface.removeColumn('RetailPrescriptionMedicines', 'total_price', { transaction });

      // 2. Rename instructions back to notes
      await queryInterface.renameColumn('RetailPrescriptionMedicines', 'instructions', 'notes', { transaction });

      // 3. Make dosage, frequency, duration non-nullable
      await queryInterface.changeColumn('RetailPrescriptionMedicines', 'dosage', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('RetailPrescriptionMedicines', 'frequency', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction });

      await queryInterface.changeColumn('RetailPrescriptionMedicines', 'duration', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction });

      // 4. Remove default value for quantity
      await queryInterface.changeColumn('RetailPrescriptionMedicines', 'quantity', {
        type: Sequelize.INTEGER,
        allowNull: false
      }, { transaction });

      // Revert RetailPrescriptionPayments table changes
      // 1. Change payment_method enum values back
      await queryInterface.changeColumn('RetailPrescriptionPayments', 'payment_method', {
        type: Sequelize.ENUM('cash', 'card', 'bank_transfer'),
        allowNull: false
      }, { transaction });

      // 2. Remove added columns
      await queryInterface.removeColumn('RetailPrescriptionPayments', 'created_by', { transaction });
      await queryInterface.removeColumn('RetailPrescriptionPayments', 'updated_by', { transaction });
    });
  }
}; 