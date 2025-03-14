import { Sequelize } from "sequelize";
import dbConfig from "../config/config.js";
import UserModel from "./user.js";
// import AdminModel from "./admin.js";
// Import các model khác nếu cần

const sequelize = new Sequelize(dbConfig.development);

const db = {
  sequelize,
  Sequelize,
  User: UserModel(sequelize, Sequelize.DataTypes),
  // Admin: AdminModel(sequelize, Sequelize.DataTypes),
  // Thêm các model khác nếu cần
};

// Thiết lập các quan hệ giữa các bảng (nếu có)
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
