import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class FamilyMember extends Model {
    static associate(models) {
      // Liên kết với Patient
      FamilyMember.belongsTo(models.Patient, {
        foreignKey: "patient_id",
        as: "patient",
      });

      // Liên kết với Appointment
      FamilyMember.hasMany(models.Appointment, {
        foreignKey: "family_member_id",
        as: "appointments",
      });
    }

    // Custom method để kiểm tra xem có phải là bệnh nhân chính không
    isMainPatient() {
      return this.relationship === "me";
    }
  }

  FamilyMember.init(
    {
      family_member_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        comment: "ID của bệnh nhân chính",
      },
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Patients",
          key: "patient_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "ID của bệnh nhân",
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Tên thành viên gia đình",
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Số điện thoại",
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Email",
      },
      gender: {
        type: DataTypes.ENUM("male", "female"),
        allowNull: false,
        comment: "Giới tính",
      },
      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: "Ngày sinh",
      },
      relationship: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "me",
        comment: "Mối quan hệ với bệnh nhân chính",
        validate: {
          isIn: {
            args: [
              ["me", "father", "mother", "child", "wife", "husband", "other"],
            ],
            msg: "Mối quan hệ không hợp lệ",
          },
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Ngày tạo",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Ngày cập nhật",
      },
    },
    {
      sequelize,
      modelName: "FamilyMember",
      tableName: "FamilyMembers",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      indexes: [
        {
          fields: ["patient_id"],
        },
        {
          fields: ["relationship"],
        },
      ],
      hooks: {
        beforeCreate: async (familyMember) => {
          // Kiểm tra nếu relationship là "me" thì đảm bảo chưa có thành viên nào khác có relationship "me"
          if (familyMember.relationship === "me") {
            const existingMainPatient = await FamilyMember.findOne({
              where: {
                patient_id: familyMember.patient_id,
                relationship: "me",
              },
            });
            if (existingMainPatient) {
              throw new Error("Đã tồn tại bệnh nhân chính cho patient này");
            }
          }
        },
      },
    }
  );

  return FamilyMember;
};
