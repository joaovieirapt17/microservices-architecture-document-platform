const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const TokenBlacklist = sequelize.define('TokenBlacklist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tUsers',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'tTokenBlacklist',
  timestamps: false
});

module.exports = TokenBlacklist;
