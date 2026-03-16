/**
 * Middleware to ensure user is authenticated
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Middleware to check if user owns the resource
 */
function ensureOwnership(Model, idParam = 'id', foreignKey = 'user_id') {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      const resource = await Model.findByPk(resourceId);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      if (resource[foreignKey] !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  ensureAuthenticated,
  ensureOwnership
};
