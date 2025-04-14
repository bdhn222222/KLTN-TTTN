import { Model, DataTypes } from "sequelize";
export default (sequelize) => {
  class Symptom extends Model {}

  Symptom.init(
    {
      symptom_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Symptom",
      tableName: "Symptoms",
      timestamps: false,
    }
  );

  // Define associations
  Symptom.associate = (models) => {
    Symptom.belongsToMany(models.Specialization, {
      through: models.SymptomSpecializationMapping,
      foreignKey: "symptom_id",
      otherKey: "specialization_id",
      as: "specializations",
    });

    Symptom.hasMany(models.SymptomSpecializationMapping, {
      foreignKey: "symptom_id",
      as: "mappings",
    });
  };

  return Symptom;
};
