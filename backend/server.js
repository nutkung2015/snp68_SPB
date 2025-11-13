const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Test Native Backend API" });
});

// Posts routes
app.use("/api/posts", require("./routes/posts"));

// Mock News routes
app.use("/api/mock/news", require("./routes/mockNews"));

// Announcements routes
app.use("/api/announcements", require("./routes/announcements"));

// Auth routes
app.use("/api/auth", authRoutes);

const unitRoutes = require("./routes/units");
app.use("/api/units", unitRoutes);

// Project routes
app.use("/api", projectRoutes); // Changed from "/api/projects" to "/api" to support /api/project-memberships
app.use("/api/project_invitations", require("./routes/project_invitations"));

// Repairs routes
app.use("/api/repairs", require("./routes/repairs"));

app.use(
  "/api/project-customizations",
  require("./routes/projectCustomizations")
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
