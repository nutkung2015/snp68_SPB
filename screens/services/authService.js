import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://localhost:5000/api/auth";

let onLogoutCallback = null;
let navigate = null; // Variable to hold the navigation function

export const setLogoutCallback = (callback) => {
  onLogoutCallback = callback;
};

export const setNavigation = (nav) => {
  // Function to set the navigation object
  navigate = nav;
};

export const navigateTo = (routeName, params) => {
  if (navigate) {
    navigate.navigate(routeName, params);
  } else {
    console.warn("Navigation function not set in authService. Cannot redirect.");
  }
};

const handleUnauthorized = async () => {
  await AsyncStorage.removeItem("userData");
  if (onLogoutCallback) {
    onLogoutCallback();
  }
};

export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.status === 401) {
      await handleUnauthorized();
      throw new Error("Unauthorized");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Store the token
    if (data.token) {
      await AsyncStorage.setItem("authToken", data.token);
    }

    // Store user data if available
    if (data.data) {
      await AsyncStorage.setItem("userData", JSON.stringify(data.data));
    }

    // Check project and unit memberships
    const hasProjectMembership =
      data.data.projectMemberships && data.data.projectMemberships.length > 0;
    const hasUnitMembership =
      data.data.unitMemberships && data.data.unitMemberships.length > 0;

    console.log("Login successful. Checking memberships:");
    console.log("hasProjectMembership:", hasProjectMembership);
    console.log("hasUnitMembership:", hasUnitMembership);

    if (hasProjectMembership && hasUnitMembership) {
      console.log("Navigating to Home");
      navigateTo("Home"); // Navigate to Home if both exist
    } else {
      console.log("Navigating to JoinUnitScreen");
      // If either is missing, navigate to JoinUnitScreen
      navigateTo("JoinUnitScreen");
    }

    return data;
  } catch (error) {
    console.error("Error in login:", error);
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (response.status === 401) {
      await handleUnauthorized();
      throw new Error("Unauthorized");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    return data;
  } catch (error) {
    console.error("Error in register:", error);
    throw error;
  }
};
