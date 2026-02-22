import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "./apiService";

let onLogoutCallback = null;
let navigate = null; // Variable to hold the navigation function

export const setLogoutCallback = (callback) => {
  onLogoutCallback = callback;
  ApiService.setLogoutCallback(callback);
};

export const setNavigation = (nav) => {
  // Function to set the navigation object
  navigate = nav;
  ApiService.setNavigation(nav);
};

export const navigateTo = (routeName, params) => {
  ApiService.navigateTo(routeName, params);
};

const handleUnauthorized = async () => {
  // Clear authToken
  await AsyncStorage.removeItem("authToken");
  await AsyncStorage.removeItem("userData");
  if (onLogoutCallback) {
    onLogoutCallback();
  }
  if (navigate) {
    navigate("Login");
  }
};

export const login = async (email, password) => {
  try {
    const data = await ApiService.post("/api/auth/login", { email, password });

    // Store the token
    if (data.data?.token) {
      await AsyncStorage.setItem("authToken", data.data.token);
    }

    // Store the refresh token
    if (data.data?.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.data.refreshToken);
    }

    // Store user data if available
    if (data.data) {
      await AsyncStorage.setItem("userData", JSON.stringify(data.data));
    }

    console.log("Login successful. User role:", data.data.role || data.data.roles?.[0]);

    // Navigation is handled by recheckLoginStatus() in LoginScreen
    // Do NOT navigate here to avoid race conditions with stale tokens

    return data;
  } catch (error) {
    console.error("Error in login:", error);
    throw error;
  }
};

export const logout = async (navigation) => {
  try {
    const refreshToken = await AsyncStorage.getItem("refreshToken");

    // Call backend to revoke token if it exists
    if (refreshToken) {
      try {
        await ApiService.post("/api/auth/logout", { refreshToken });
      } catch (apiError) {
        console.warn("Logout API failed, proceeding with local cleanup", apiError);
      }
    }

    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("userData");

    if (navigation) {
      navigation.navigate("LoginScreen");
    }
    if (onLogoutCallback) {
      onLogoutCallback();
    }
  } catch (error) {
    console.error("Error during logout:", error);
    // Ensure navigation happens even if error
    if (navigation) {
      navigation.navigate("LoginScreen");
    }
  }
};

export const register = async (userData) => {
  try {
    const data = await ApiService.post("/api/auth/register", userData);
    return data;
  } catch (error) {
    console.error("Error in register:", error);
    throw error;
  }
};
