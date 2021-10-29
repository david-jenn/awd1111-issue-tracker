function hasRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'You are not logged in!' });
    } else if (!req.auth.role) {
      return res.status(403).json({ error: 'You have not been assigned a role!' });
    } else if (Array.isArray(req.auth.role) && !req.auth.role[0]) {
      return res.status(403).json({ error: 'You have not been assigned a role!' });
    } else {
      const authRoles =
        Array.isArray(req.auth.role) ?
        req.auth.role : [req.auth.role];

      for (const role of allowedRoles) {
        if (authRoles.includes(role)) {
          return next();
        }
      }

      // user is not in any of the allowed groups
      return res.status(403).json({ error: 'You do not have one of the allowed roles!' });
    }
  };
}

module.exports = hasRole;