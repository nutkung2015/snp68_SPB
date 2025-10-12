const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.getProjectDetails = async (req, res) => {
  try {
    // Logic to fetch project details
    res.status(200).json({ message: "Project details placeholder" });
  } catch (error) {
    console.error("Error in getProjectDetails:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, address, rules, common_fee_info } = req.body;

    const projectId = uuidv4();

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO projects (id, name, address, rules, common_fee_info, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [projectId, name, address, rules, common_fee_info]
      );

    res.status(201).json({
      status: "success",
      message: "Project created successfully",
      data: {
        id: projectId,
        name,
        address,
        rules,
        common_fee_info,
      },
    });
  } catch (error) {
    console.error("Error in createProject:", error);
    res.status(500).json({ message: "Server error" });
  }
};