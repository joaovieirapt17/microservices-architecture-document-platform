const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const authRoutes = require("./routes/authRoutes");
const { errorHandler } = require("./middleware/errorHandler");
const sequelize = require("./config/sequelize");
const User = require("./models/User");
const TokenBlacklist = require("./models/TokenBlacklist");
const AuthLog = require("./models/AuthLog");
const { Op } = require("sequelize");

// Load environment variables from .env
if (process.env.NODE_ENV !== "production" || !process.env.SQL_SERVER) {
  require("dotenv").config({ path: path.resolve(__dirname, ".env") });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Routes
app.use("/api/auth", authRoutes);
// Error handling middleware
app.use(errorHandler);

// Sync database and start server
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database synchronized");

    // Cleanup expired tokens periodically
    setInterval(async () => {
      try {
        await TokenBlacklist.destroy({
          where: {
            expires_at: {
              [Op.lt]: new Date(),
            },
          },
        });
        console.log("Cleaned up expired tokens");
      } catch (error) {
        console.error("Error cleaning up tokens:", error);
      }
    }, 60 * 60 * 1000);

    // Start server
    app.listen(PORT, () => {
      console.log(`Server available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
  });

module.exports = app;
