const User = require('./User');
const EmailAccount = require('./EmailAccount');
const Message = require('./Message');
const Settings = require('./Settings');

// Define associations
User.hasMany(EmailAccount, { foreignKey: 'user_id', as: 'emailAccounts' });
EmailAccount.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

EmailAccount.hasMany(Message, { foreignKey: 'account_id', as: 'messages' });
Message.belongsTo(EmailAccount, { foreignKey: 'account_id', as: 'account' });

User.hasMany(Settings, { foreignKey: 'user_id', as: 'settings' });
Settings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  User,
  EmailAccount,
  Message,
  Settings
};
