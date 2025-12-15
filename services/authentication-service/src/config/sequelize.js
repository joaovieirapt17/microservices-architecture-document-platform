const { Sequelize } = require("sequelize");
const path = require("path");

// Load environment variables from .env
// In Docker, variables come from docker-compose.yml
if (process.env.NODE_ENV !== "production" || !process.env.SQL_SERVER) {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}

// Sequelize configuration
const sequelize = new Sequelize(
  process.env.SQL_DATABASE || process.env.DB_NAME || "ScriptumAI-DBA",
  process.env.SQL_USER || process.env.DB_USER || "postgres",
  String(process.env.SQL_PASSWORD || process.env.DB_PASSWORD || ""),
  {
    host: process.env.SQL_SERVER || process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    dialectOptions: {
      ssl:
        process.env.DB_SSL === "true"
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    console.log("Connected to PostgreSQL database");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err.message);
  });

module.exports = sequelize;
