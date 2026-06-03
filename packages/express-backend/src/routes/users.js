const express = require("express");
const { clearUserAuthCookie } = require("../auth");
const roomServices = require("../rooms/room-services.js");
const userServices = require("../user/user-services.js");
const { normalizeRoomCode } = require("../utils/room-code.js");
const {
  authenticatedUserResponse,
  getAuthenticatedUserId,
  userResponse,
} = require("../utils/user-response.js");

function createUsersRouter() {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const { userName } = req.query;
    await userServices
      .getUsers(userName)
      .then((users) => res.json(users))
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.get("/me", async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    await userServices
      .findUserById(userId)
      .then((user) => {
        if (!user) return res.status(404).send("User not found.");
        res.json(userResponse(user));
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.delete("/me", async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    await userServices
      .deleteUser(userId)
      .then((deleted) => {
        if (!deleted) return res.status(404).send("User not found.");
        clearUserAuthCookie(req, res);
        res.status(204).send();
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.post("/me/logout", async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    await userServices
      .logoutUser(userId)
      .then((user) => {
        clearUserAuthCookie(req, res);
        res.json(userResponse(user));
      })
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/me/heartbeat", async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const roomCode = normalizeRoomCode(req.body.roomCode);
    const roomMemberName = (req.body.roomMemberName || "").trim();

    try {
      const user = await userServices.heartbeatUser(userId, req.auth.sessionId);

      if (roomCode && roomMemberName) {
        await roomServices.recordMemberHeartbeat(roomCode, roomMemberName);
      }

      res.json({
        authenticated: true,
        userId: user._id,
        lastActiveAt: user.lastActiveAt,
      });
    } catch (err) {
      clearUserAuthCookie(req, res);
      res.status(401).json({ error: err.message });
    }
  });

  router.patch("/me/rename", async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { newUserName } = req.body;
    if (!newUserName) {
      return res.status(400).json({ error: "newUserName is required" });
    }

    await userServices
      .renameUser(userId, newUserName)
      .then((user) => res.json(userResponse(user)))
      .catch((err) => {
        if (err.message.includes("already taken")) {
          return res.status(409).json({ error: err.message });
        }
        res.status(400).json({ error: err.message });
      });
  });

  router.patch("/me/password", async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "newPassword is required" });
    }

    await userServices
      .changePassword(userId, newPassword)
      .then((user) => res.json(userResponse(user)))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.patch("/me/prefs", async (req, res) => {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    await userServices
      .changePrefs(userId, req.body)
      .then((user) => res.json(userResponse(user)))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.get("/:id", async (req, res) => {
    await userServices
      .findUserById(req.params.id)
      .then((user) => {
        if (!user) return res.status(404).send("User not found.");
        res.json(user);
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.post("/", async (req, res) => {
    console.log("Received create user request with body:", req.body);
    const userName = req.body.username;
    const passWord = req.body.password;

    await userServices
      .createUser(userName, passWord)
      .then(async (created) => {
        res.status(201).json(await authenticatedUserResponse(req, res, created));
      })
      .catch((err) => {
        if (
          err.message?.includes("already exists") ||
          err.code === 11000 ||
          (err.message && err.message.toLowerCase().includes("duplicate key"))
        ) {
          return res.status(409).json({ error: err.message });
        }
        res.status(400).json({ error: err.message });
      });
  });

  router.delete("/:id", async (req, res) => {
    await userServices
      .deleteUser(req.params.id)
      .then((deleted) => {
        if (!deleted) return res.status(404).send("User not found.");
        res.status(204).send();
      })
      .catch((err) => res.status(500).json({ error: err.message }));
  });

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    await userServices
      .loginUser(username, password)
      .then(async (user) => {
        res.json(await authenticatedUserResponse(req, res, user));
      })
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:id/logout", async (req, res) => {
    await userServices
      .logoutUser(req.params.id)
      .then((user) => {
        clearUserAuthCookie(req, res);
        res.json(user);
      })
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.patch("/:id/rename", async (req, res) => {
    const { newUserName } = req.body;
    if (!newUserName) {
      return res.status(400).json({ error: "newUserName is required" });
    }
    await userServices
      .renameUser(req.params.id, newUserName)
      .then((user) => res.json(user))
      .catch((err) => {
        if (err.message.includes("already taken")) {
          return res.status(409).json({ error: err.message });
        }
        res.status(400).json({ error: err.message });
      });
  });

  router.patch("/:id/password", async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "newPassword is required" });
    }

    await userServices
      .changePassword(req.params.id, newPassword)
      .then((user) => res.json(user))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:id/timeout", async (req, res) => {
    await userServices
      .timeoutUser(req.params.id)
      .then((user) => res.json(user))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:id/unban", async (req, res) => {
    await userServices
      .unbanUser(req.params.id)
      .then((user) => res.json(user))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.patch("/:id/prefs", async (req, res) => {
    await userServices
      .changePrefs(req.params.id, req.body)
      .then((user) => res.json(user))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:id/promote", async (req, res) => {
    await userServices
      .promoteToAdmin(req.params.id)
      .then((user) => res.json(user))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.post("/:id/demote", async (req, res) => {
    await userServices
      .demoteFromAdmin(req.params.id)
      .then((user) => res.json(user))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  router.get("/:id/admin-status", async (req, res) => {
    await userServices
      .isAdmin(req.params.id)
      .then((isAdminStatus) => res.json({ isAdmin: isAdminStatus }))
      .catch((err) => res.status(400).json({ error: err.message }));
  });

  return router;
}

module.exports = createUsersRouter;
