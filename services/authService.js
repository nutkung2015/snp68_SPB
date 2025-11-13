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

    // Store user data if available
    if (data.data) {
      await AsyncStorage.setItem("userData", JSON.stringify(data.data));
    }

    // Check user role
    const userRole = data.data.role || data.data.roles?.[0];
    
    console.log("Login successful. User role:", userRole);
    
    if (userRole === "security") {
      // Security users go directly to GuardHome
      console.log("Navigating to GuardHome");
      navigateTo("GuardHome");
    } else {
      // Regular users - check project and unit memberships
      const hasProjectMembership =
        data.data.projectMemberships && data.data.projectMemberships.length > 0;
      const hasUnitMembership =
        data.data.unitMemberships && data.data.unitMemberships.length > 0;

      console.log("Checking memberships:");
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
    }

    return data;
  } catch (error) {
    console.error("Error in login:", error);
    throw error;
  }
};

export const logout = async (navigation) => {
  try {
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("userData");
    if (navigation) {
      navigation.navigate("LoginScreen");
    }
    if (onLogoutCallback) {
      onLogoutCallback();
    }
  } catch (error) {
    console.error("Error during logout:", error);
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
