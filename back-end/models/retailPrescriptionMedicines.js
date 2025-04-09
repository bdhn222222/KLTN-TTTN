import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class RetailPrescriptionMedicine extends Model {
    static associate(models) {
      // Liên kết với RetailPrescription
      RetailPrescriptionMedicine.belongsTo(models.RetailPrescription, {
        foreignKey: 'retail_prescription_id',
        as: 'retailPrescription'
      });
      
      // Liên kết với Medicine
      RetailPrescriptionMedicine.belongsTo(models.Medicine, {
        foreignKey: 'medicine_id',
        as: 'medicine'
      });
    }
  }

  RetailPrescriptionMedicine.init(
    {
      retail_prescription_medicine_id: {
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
      medicine_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Medicines',
          key: 'medicine_id'
        }
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      actual_quantity: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      dosage: {
        type: DataTypes.STRING,
        allowNull: true
      },
      frequency: {
        type: DataTypes.STRING,
        allowNull: true
      },
      duration: {
        type: DataTypes.STRING,
        allowNull: true
      },
      instructions: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'RetailPrescriptionMedicine',
      tableName: 'RetailPrescriptionMedicines',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  return RetailPrescriptionMedicine;
};
