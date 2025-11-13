const jwt = require("jsonwebtoken");
const db = require("../config/db"); // Assuming you have a db connection here

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No token provided or token format is invalid." });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user payload to the request object

    // Optional: Fetch user from DB to ensure user still exists
    const [rows] = await db
      .promise()
      .execute("SELECT id, email, role, full_name, phone FROM users WHERE id = ?", [
        req.user.id,
      ]);
    if (rows.length === 0) {
      console.log("User not found in DB for token ID:", req.user.id);
      return res
        .status(401)
        .json({ message: "User not found, authorization denied" });
    }
    req.user = rows[0]; // Update req.user with fresh data from DB

    // Fetch project memberships for the user
    const [projectMemberships] = await db
      .promise()
      .query(
        "SELECT pm.project_id, pm.role, p.name AS project_name FROM project_members pm JOIN projects p ON pm.project_id = p.id WHERE pm.user_id = ? AND pm.role IN ('juristicLeader', 'juristicMember', 'member', 'security')",
        [req.user.id]
      );

    req.user.projectMemberships = projectMemberships; // Add project memberships to user object

    next();
  } catch (error) {
    console.error("Error in authMiddleware:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    res
      .status(401)
      .json({ message: "Token is not valid", error: error.message });
  }
};

module.exports = authMiddleware;
