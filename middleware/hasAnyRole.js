function hasAnyRole() {
  return(req, res, next) => {
    if(!req.auth) {
      return res.status(401).json({ error: 'You are not logged in!'});
    } else if (!req.auth.role) {
      return res.status(403).json({ error: 'You do not have a role'});
    } else {
      return next();
    }
  };
}

module.exports = hasAnyRole;