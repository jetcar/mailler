const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'email_accounts',
      key: 'id'
    }
  },
  message_id: {
    type: DataTypes.STRING(500)
  },
  from_address: {
    type: DataTypes.TEXT
  },
  to_addresses: {
    type: DataTypes.TEXT
  },
  cc_addresses: {
    type: DataTypes.TEXT
  },
  subject: {
    type: DataTypes.TEXT
  },
  body_text: {
    type: DataTypes.TEXT
  },
  body_html: {
    type: DataTypes.TEXT
  },
  received_date: {
    type: DataTypes.DATE
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_starred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  folder: {
    type: DataTypes.STRING(100),
    defaultValue: 'INBOX'
  },
  raw_headers: {
    type: DataTypes.JSONB
  }
}, {
  tableName: 'messages',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Message;
