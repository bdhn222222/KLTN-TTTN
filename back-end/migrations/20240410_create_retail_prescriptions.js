'use strict';

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('RetailPrescriptions', {
    retail_prescription_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    patient_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Patients',
        key: 'patient_id'
      }
    },
    pharmacist_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Pharmacists',
        key: 'pharmacist_id'
      }
    },
    status: {
      type: Sequelize.ENUM('pending_prepare', 'waiting_payment', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending_prepare'
    },
    medicine_details: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    cancelled_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Pharmacists',
        key: 'pharmacist_id'
      }
    },
    cancelled_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    cancelled_reason: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false
    }
  });

  await queryInterface.createTable('RetailPrescriptionMedicines', {
    retail_prescription_medicine_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    retail_prescription_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'RetailPrescriptions',
        key: 'retail_prescription_id'
      }
    },
    medicine_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Medicines',
        key: 'medicine_id'
      }
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    actual_quantity: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    unit_price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    dosage: {
      type: Sequelize.STRING,
      allowNull: true
    },
    frequency: {
      type: Sequelize.STRING,
      allowNull: true
    },
    duration: {
      type: Sequelize.STRING,
      allowNull: true
    },
    instructions: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false
    }
  });

  await queryInterface.createTable('RetailPrescriptionPayments', {
    retail_prescription_payment_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    retail_prescription_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'RetailPrescriptions',
        key: 'retail_prescription_id'
      }
    },
    amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: Sequelize.ENUM('pending', 'paid', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    payment_method: {
      type: Sequelize.ENUM('cash', 'card', 'transfer', 'momo', 'vnpay', 'zalopay'),
      allowNull: true
    },
    payment_date: {
      type: Sequelize.DATE,
      allowNull: true
    },
    note: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    created_by: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Pharmacists',
        key: 'pharmacist_id'
      }
    },
    updated_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Pharmacists',
        key: 'pharmacist_id'
      }
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false
    }
  });

  // Add indexes
  await queryInterface.addIndex('RetailPrescriptions', ['patient_id']);
  await queryInterface.addIndex('RetailPrescriptions', ['pharmacist_id']);
  await queryInterface.addIndex('RetailPrescriptions', ['status']);
  await queryInterface.addIndex('RetailPrescriptionMedicines', ['retail_prescription_id']);
  await queryInterface.addIndex('RetailPrescriptionMedicines', ['medicine_id']);
  await queryInterface.addIndex('RetailPrescriptionPayments', ['retail_prescription_id']);
  await queryInterface.addIndex('RetailPrescriptionPayments', ['status']);
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('RetailPrescriptionPayments');
  await queryInterface.dropTable('RetailPrescriptionMedicines');
  await queryInterface.dropTable('RetailPrescriptions');
};