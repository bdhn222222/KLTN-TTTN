import { configDotenv } from "dotenv";
configDotenv({ path: "../.env" });

export default {
  development: {
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "N123456@",
    database: process.env.DB_NAME || "booking_doctor_management",
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: "mysql",
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
  },
};