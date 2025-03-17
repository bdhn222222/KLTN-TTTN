import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Feedback extends Model {
    static associate(models) {
      // Liên kết với bảng Appointments
      Feedback.belongsTo(models.Appointment, { foreignKey: "appointment_id", as: "appointment" });
  
    }
  }

  Feedback.init(
    {
      feedback_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Appointments",
          key: "appointment_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Feedback",
      tableName: "Feedbacks",
      timestamps: true,
    }
  );

  return Feedback;
};
