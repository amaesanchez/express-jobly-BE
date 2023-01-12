"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */
// in insomnia
// authorization : Bearer [token]
function authenticateJWT(req, res, next) {
  try {
    // && - short circuiting
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  if (!res.locals.user) throw new UnauthorizedError();
  return next();
}

/** Middleware to use when admin must be logged in
 *
 * If not, raises Unauthorized.
*/
function ensureAdminLoggedIn(req, res, next) {
  const user = res.locals.user;
  if (!user || !user.isAdmin) throw new UnauthorizedError();
  return next();
}

/** Middleware to use when current user logged in must be user of route being
 * accessed, or current user is the admin
 *
 * If not, raises Unauthorized.
*/
function ensureCurrUserOrAdmin(req, res, next) {
  const user = res.locals.user;

  if (user?.isAdmin || user?.username === req.params?.username) {
    return next();
  }
  throw new UnauthorizedError();
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdminLoggedIn,
  ensureCurrUserOrAdmin,
};
