import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class RetailPrescription extends Model {
    static associate(models) {
      // Liên kết với Patient (bệnh nhân)
      RetailPrescription.belongsTo(models.Patient, {
        foreignKey: 'patient_id',
        as: 'patient'
      });

      // Liên kết với Pharmacist (dược sĩ)
      RetailPrescription.belongsTo(models.Pharmacist, {
        foreignKey: 'pharmacist_id',
        as: 'pharmacist'
      });

      // Liên kết với Pharmacist (người hủy đơn thuốc)
      RetailPrescription.belongsTo(models.Pharmacist, {
        foreignKey: 'cancelled_by',
        as: 'cancelledByPharmacist'
      });

      // Liên kết với RetailPrescriptionMedicine
      RetailPrescription.hasMany(models.RetailPrescriptionMedicine, {
        foreignKey: 'retail_prescription_id',
        as: 'retailPrescriptionMedicines'
      });

      // Liên kết với RetailPrescriptionPayment
      RetailPrescription.hasMany(models.RetailPrescriptionPayment, {
        foreignKey: 'retail_prescription_id',
        as: 'retailPrescriptionPayments'
      });
    }
  }

  RetailPrescription.init(
    {
      retail_prescription_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Patients',
          key: 'patient_id'
        }
      },
      pharmacist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Pharmacists',
          key: 'pharmacist_id'
        }
      },
      status: {
        type: DataTypes.ENUM('pending_prepare', 'waiting_payment', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending_prepare'
      },
      medicine_details: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      cancelled_reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      cancelled_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Pharmacists',
          key: 'pharmacist_id'
        }
      }
    },
    {
      sequelize,
      modelName: 'RetailPrescription',
      tableName: 'RetailPrescriptions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  return RetailPrescription;
};
