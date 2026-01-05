import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl, getApiHeaders } from "../utils/config";

const API_BASE_URL = getApiBaseUrl();

// Base API Service สำหรับจัดการ API calls กลาง
class ApiService {
  // Generic GET request
  static async get(endpoint, token = null) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: getApiHeaders(token),
      });

      if (response.status === 401) {
        await this.handleUnauthorized();
        throw new Error("Unauthorized");
      }

      // Handle rate limiting (429)
      if (response.status === 429) {
        throw new Error("คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่");
      }

      // Try to parse JSON, but handle non-JSON responses
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // Response is not JSON (possibly plain text error)
        const text = await response.text();
        if (!response.ok) {
          throw new Error(text || "Request failed");
        }
        // Return wrapped text as data
        data = { message: text };
      }

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error(`Error in GET ${endpoint}:`, error);
      throw error;
    }
  }

  // Generic POST request
  static async post(endpoint, body, token = null, isMultipart = false) {
    try {
      console.log('API Request:', {
        url: `${API_BASE_URL}${endpoint}`,
        // Don't log multipart body object in detail to avoid clutter
        body: isMultipart ? 'FormData' : body,
        headers: isMultipart ? 'Multipart Headers' : getApiHeaders(token)
      });

      const headers = isMultipart
        ? { Authorization: `Bearer ${token}` } // Content-Type is auto-set by boundary for FormData
        : getApiHeaders(token);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: headers,
        body: isMultipart ? body : JSON.stringify(body),
      });

      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.status === 401) {
        await this.handleUnauthorized();
        throw new Error("Unauthorized");
      }

      const data = await response.json();
      console.log('API Data:', data);

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error(`Error in POST ${endpoint}:`, error);
      throw error;
    }
  }

  // Generic PUT request
  static async put(endpoint, body, token = null) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PUT",
        headers: getApiHeaders(token),
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        await this.handleUnauthorized();
        throw new Error("Unauthorized");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error(`Error in PUT ${endpoint}:`, error);
      throw error;
    }
  }

  // Generic DELETE request
  static async delete(endpoint, token = null) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: getApiHeaders(token),
      });

      if (response.status === 401) {
        await this.handleUnauthorized();
        throw new Error("Unauthorized");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error(`Error in DELETE ${endpoint}:`, error);
      throw error;
    }
  }

  // Handle unauthorized access
  static async handleUnauthorized() {
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("userData");
    // Trigger logout callback if set
    if (this.onLogoutCallback) {
      this.onLogoutCallback();
    }
    // Navigate to Login screen
    if (this.navigate && typeof this.navigate.navigate === 'function') {
      this.navigate.navigate("Login");
    } else if (typeof this.navigate === 'function') {
      this.navigate("Login");
    }
  }

  // Set logout callback
  static setLogoutCallback(callback) {
    this.onLogoutCallback = callback;
  }

  // Set navigation
  static setNavigation(nav) {
    this.navigate = nav;
  }

  // Navigate to route
  static navigateTo(routeName, params) {
    if (this.navigate) {
      this.navigate.navigate(routeName, params);
    } else {
      console.warn("Navigation function not set in ApiService. Cannot redirect.");
    }
  }

  // Get stored token
  static async getToken() {
    try {
      const userDataStr = await AsyncStorage.getItem("userData");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      return userData?.token || null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }
}

export default ApiService;
