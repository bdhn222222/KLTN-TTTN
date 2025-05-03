import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Batch extends Model {
    static associate(models) {
      // Mỗi Batch thuộc về 1 Medicine
      Batch.belongsTo(models.Medicine, {
        foreignKey: "medicine_id",
        as: "medicine",
        onDelete: "CASCADE",
      });
    }
  }

  Batch.init(
    {
      batch_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      batch_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      medicine_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      import_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("Active", "Expired", "Disposed"),
        allowNull: false,
        defaultValue: "Active",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    },
    {
      sequelize,
      modelName: "Batch",
      tableName: "Batches",
      timestamps: false,
    }
  );

  return Batch;
};
