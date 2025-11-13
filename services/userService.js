import ApiService from "./apiService";

// User Profile API Service
class UserService {
  // Get user profile
  static async getUserProfile() {
    try {
      const token = await ApiService.getToken();
      return await ApiService.get("/api/auth/profile", token);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  }

  // Update user profile
  static async updateUserProfile(userData) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.put("/api/auth/profile", userData, token);
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  // Change password
  static async changePassword(oldPassword, newPassword) {
    try {
      const token = await ApiService.getToken();
      return await ApiService.post("/api/auth/change-password", {
        oldPassword,
        newPassword
      }, token);
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  // Upload profile picture
  static async uploadProfilePicture(imageUri) {
    try {
      const token = await ApiService.getToken();
      const formData = new FormData();
      
      formData.append('profile_picture', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });

      // For file upload, we need to use fetch directly with FormData
      const response = await fetch(`${await ApiService.getApiBaseUrl()}/api/auth/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      return data;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      throw error;
    }
  }
}

export default UserService;
