import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class RetailPrescriptionPayment extends Model {
    static associate(models) {
      RetailPrescriptionPayment.belongsTo(models.RetailPrescription, {
        foreignKey: 'retail_prescription_id',
        as: 'retailPrescription'
      });
    }
  }

  RetailPrescriptionPayment.init(
    {
      retail_prescription_payment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      retail_prescription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'RetailPrescriptions',
          key: 'retail_prescription_id'
        }
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      payment_method: {
        type: DataTypes.ENUM('cash', 'zalopay'),
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Pharmacists',
          key: 'pharmacist_id'
        }
      },
      updated_by: {
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
      modelName: 'RetailPrescriptionPayment',
      tableName: 'RetailPrescriptionPayments',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  return RetailPrescriptionPayment;
};
