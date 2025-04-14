import { Model, DataTypes } from "sequelize";

export default (sequelize) => {
  class Patient extends Model {
    static associate(models) {
      // Liên kết với User
      Patient.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      // Liên kết với FamilyMember
      Patient.hasMany(models.FamilyMember, {
        foreignKey: "patient_id",
        as: "familyMembers",
      });
    }

    // Custom method để lấy FamilyMember "me"
    async getMainFamilyMember() {
      return await this.getFamilyMembers({
        where: { relationship: "me" },
      });
    }
  }

  Patient.init(
    {
      patient_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        comment: "ID của bệnh nhân",
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "ID của user",
      },
      date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Ngày sinh",
      },
      gender: {
        type: DataTypes.ENUM("male", "female"),
        allowNull: true,
        comment: "Giới tính",
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Địa chỉ",
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false,
        comment: "Số điện thoại",
      },
      insurance_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: "Số bảo hiểm y tế",
      },
      id_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: "Số CMND/CCCD",
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Trạng thái xác thực",
      },
      otp_code: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Mã OTP xác thực",
      },
      otp_expiry: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Thời gian hết hạn OTP",
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
      modelName: "Patient",
      tableName: "Patients",
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      indexes: [
        {
          fields: ["user_id"],
        },
      ],
      hooks: {
        afterCreate: async (patient) => {
          // Tự động tạo FamilyMember "me" khi tạo Patient mới
          const { FamilyMember } = sequelize.models;
          const user = await patient.getUser();

          await FamilyMember.create({
            patient_id: patient.patient_id,
            username: user.username,
            phone_number: patient.phone_number,
            email: user.email,
            gender: patient.gender,
            date_of_birth: patient.date_of_birth,
            relationship: "me",
          });
        },
      },
    }
  );

  return Patient;
};
