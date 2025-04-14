import { Model, DataTypes } from "sequelize";
export default (sequelize) => {
  class SymptomSpecializationMapping extends Model {}

  SymptomSpecializationMapping.init(
    {
      symptom_specialization_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      symptom_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Symptoms",
          key: "symptom_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      specialization_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Specializations",
          key: "specialization_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
    {
      sequelize,
      modelName: "SymptomSpecializationMapping",
      tableName: "Symptom_Specialization_Mapping",
      timestamps: false,
    }
  );

  // Define associations
  SymptomSpecializationMapping.associate = (models) => {
    SymptomSpecializationMapping.belongsTo(models.Symptom, {
      foreignKey: "symptom_id",
      as: "symptom",
    });

    SymptomSpecializationMapping.belongsTo(models.Specialization, {
      foreignKey: "specialization_id",
      as: "specialization",
    });
  };

  return SymptomSpecializationMapping;
};
