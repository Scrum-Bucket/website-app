const { setUserAuthCookie } = require("../auth");
const userServices = require("../user/user-services.js");

function userResponse(user) {
  const userData = typeof user.toObject === "function" ? user.toObject() : user;
  delete userData.passWord;

  return { ...userData, authenticated: true };
}

async function authenticatedUserResponse(req, res, user) {
  const { token, sessionId } = setUserAuthCookie(req, res, user);
  const sessionUser = (await userServices.registerUserSession(user._id, sessionId)) || user;

  return {
    ...userResponse(sessionUser),
    sessionToken: token,
  };
}

function getAuthenticatedUserId(req, res) {
  const userId = req.auth?.type === "frontend-user" ? req.auth.userId : null;

  if (!userId) {
    res.status(401).json({ error: "User session required." });
    return null;
  }

  return userId;
}

module.exports = {
  authenticatedUserResponse,
  getAuthenticatedUserId,
  userResponse,
};
