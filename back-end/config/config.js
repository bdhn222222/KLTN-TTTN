import dotenv from "dotenv";
dotenv.config();

export default {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your_jwt_secret_key", 
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  },
};
