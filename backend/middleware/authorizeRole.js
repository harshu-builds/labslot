
const { db } = require("../config/firebase");

const authorizeRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userDoc = await db
        .collection("users")
        .doc(req.user.uid)
        .get();

      if (!userDoc.exists) {
        return res.status(403).json({
          success: false,
          message: "User profile not found"
        });
      }

      const userData = userDoc.data();

      if (!allowedRoles.includes(userData.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission"
        });
      }

      req.user.role = userData.role;
      req.user.profile = userData;

      next();

    } catch (error) {
      console.error("Authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Authorization failed"
      });
    }
  };
};

module.exports = authorizeRole;
