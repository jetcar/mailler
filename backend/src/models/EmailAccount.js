const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const encryptionService = require('../services/encryption');

const EmailAccount = sequelize.define('EmailAccount', {
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
  email_address: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  imap_host: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  imap_port: {
    type: DataTypes.INTEGER,
    defaultValue: 993
  },
  imap_username: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  imap_password: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  smtp_host: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  smtp_port: {
    type: DataTypes.INTEGER,
    defaultValue: 587
  },
  smtp_username: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  smtp_password: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'email_accounts',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: (account) => {
      if (account.imap_password) {
        account.imap_password = encryptionService.encrypt(account.imap_password);
      }
      if (account.smtp_password) {
        account.smtp_password = encryptionService.encrypt(account.smtp_password);
      }
    },
    beforeUpdate: (account) => {
      if (account.changed('imap_password')) {
        account.imap_password = encryptionService.encrypt(account.imap_password);
      }
      if (account.changed('smtp_password')) {
        account.smtp_password = encryptionService.encrypt(account.smtp_password);
      }
    }
  }
});

EmailAccount.prototype.getDecryptedImapPassword = function() {
  return encryptionService.decrypt(this.imap_password);
};

EmailAccount.prototype.getDecryptedSmtpPassword = function() {
  return encryptionService.decrypt(this.smtp_password);
};

module.exports = EmailAccount;
