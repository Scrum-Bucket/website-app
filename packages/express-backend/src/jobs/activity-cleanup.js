const roomServices = require("../rooms/room-services.js");
const userServices = require("../user/user-services.js");

const USER_HEARTBEAT_TIMEOUT_MS = Number(process.env.USER_HEARTBEAT_TIMEOUT_MS) || 75000;
const AUTO_LOGOUT_INTERVAL_MS = Number(process.env.AUTO_LOGOUT_INTERVAL_MS) || 30000;

function startActivityCleanup() {
  const autoLogoutInterval = setInterval(() => {
    userServices.logoutInactiveUsers(USER_HEARTBEAT_TIMEOUT_MS).catch((error) => {
      console.error("Failed to auto-logout inactive users:", error);
    });
    roomServices.pruneInactiveRooms().catch((error) => {
      console.error("Failed to prune inactive room members:", error);
    });
  }, AUTO_LOGOUT_INTERVAL_MS);

  if (typeof autoLogoutInterval.unref === "function") {
    autoLogoutInterval.unref();
  }

  return autoLogoutInterval;
}

module.exports = {
  AUTO_LOGOUT_INTERVAL_MS,
  USER_HEARTBEAT_TIMEOUT_MS,
  startActivityCleanup,
};
