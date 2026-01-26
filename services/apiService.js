import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl, getApiHeaders } from "../utils/config";

const API_BASE_URL = getApiBaseUrl();

// Base API Service สำหรับจัดการ API calls กลาง
class ApiService {
  static isRefreshing = false;
  static refreshPromise = null;

  static async tryRefreshToken() {
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Use fetch directly to avoid infinite loop
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.status === 200) {
          const data = await response.json();
          const newAccessToken = data.data.token;
          const newRefreshToken = data.data.refreshToken;

          if (newAccessToken) {
            await AsyncStorage.setItem("authToken", newAccessToken);
          }
          if (newRefreshToken) {
            await AsyncStorage.setItem("refreshToken", newRefreshToken);
          }

          console.log("Token refreshed successfully");
          return newAccessToken;
        } else {
          throw new Error("Refresh token returned non-200");
        }
      } catch (error) {
        console.error("Refresh token failed:", error);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Generic GET request
  static async get(endpoint, token = null) {
    try {
      let currentToken = token;
      let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: getApiHeaders(currentToken),
      });

      if (response.status === 401) {
        console.log("Access token expired, attempting refresh...");
        const newToken = await this.tryRefreshToken();
        if (newToken) {
          // Retry with new token
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "GET",
            headers: getApiHeaders(newToken),
          });
        } else {
          await this.handleUnauthorized();
          throw new Error("Unauthorized");
        }
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

      let currentToken = token;
      let headers = isMultipart
        ? { Authorization: `Bearer ${currentToken}` } // Content-Type is auto-set by boundary for FormData
        : getApiHeaders(currentToken);

      let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: headers,
        body: isMultipart ? body : JSON.stringify(body),
      });

      if (response.status === 401) {
        // Skip refresh logic for login/refresh/logout endpoints to prevent loops
        if (endpoint.includes("/login") || endpoint.includes("/refresh") || endpoint.includes("/logout")) {
          // For login, 401 is valid (wrong password)
          await this.handleUnauthorized();
          throw new Error("Unauthorized");
        }

        console.log("Access token expired during POST, attempting refresh...");
        const newToken = await this.tryRefreshToken();

        if (newToken) {
          // Retry
          const retryHeaders = isMultipart
            ? { Authorization: `Bearer ${newToken}` }
            : getApiHeaders(newToken);

          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: retryHeaders,
            body: isMultipart ? body : JSON.stringify(body),
          });
        } else {
          await this.handleUnauthorized();
          throw new Error("Unauthorized");
        }
      }

      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText
      });

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
      let currentToken = token;
      let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PUT",
        headers: getApiHeaders(currentToken),
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        console.log("Access token expired during PUT, attempting refresh...");
        const newToken = await this.tryRefreshToken();
        if (newToken) {
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "PUT",
            headers: getApiHeaders(newToken),
            body: JSON.stringify(body),
          });
        } else {
          await this.handleUnauthorized();
          throw new Error("Unauthorized");
        }
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
      let currentToken = token;
      let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: getApiHeaders(currentToken),
      });

      if (response.status === 401) {
        console.log("Access token expired during DELETE, attempting refresh...");
        const newToken = await this.tryRefreshToken();
        if (newToken) {
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "DELETE",
            headers: getApiHeaders(newToken),
          });
        } else {
          await this.handleUnauthorized();
          throw new Error("Unauthorized");
        }
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
    await AsyncStorage.removeItem("refreshToken"); // Ensure refresh token is also removed
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
