const mongoose = require("mongoose");

const ProjectCustomizationSchema = new mongoose.Schema({
  project_id: { type: String, required: true },
  primary_color: { type: String, required: true },
  secondary_color: { type: String, required: true },
  logo_url: { type: String },
  favicon_url: { type: String },
});

module.exports = mongoose.model(
  "ProjectCustomization",
  ProjectCustomizationSchema
);
