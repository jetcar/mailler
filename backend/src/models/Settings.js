const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  key: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  value: {
    type: DataTypes.JSONB
  }
}, {
  tableName: 'settings',
  underscored: true,
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'key']
    }
  ]
});

module.exports = Settings;
