import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomNavigation from "../../components/BottomNavigation";
import { useNavigation } from "@react-navigation/native";
import { onLogoutCallback } from "../services/authService";

const ProfileScreen = ({ recheckLoginStatus }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userData");
      if (typeof onLogoutCallback === "function") {
        onLogoutCallback();
      } else {
        console.warn("onLogoutCallback not set in ProfileScreen for logout.");
      }
    } catch (error) {
      console.error("Error during logout:", error);
      Alert.alert("Error", "Failed to logout.");
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("userData");
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const token = userData?.token;
        console.log("ProfileScreen: Fetched authToken:", token);
        if (!token) {
          console.log("ProfileScreen: No authToken found, returning.");
          return;
        }

        const response = await fetch("http://localhost:5000/api/auth/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("ProfileScreen: API response status:", response.status);

        if (response.status === 401) {
          console.log("ProfileScreen: Unauthorized (401), handling logout.");
          await AsyncStorage.removeItem("authToken");
          // Assuming recheckLoginStatus is available globally or passed down
          // If not, you might need to import it or pass it as a prop
          // For now, let's assume it's accessible.
          // recheckLoginStatus(); // This function is in App.js, not directly accessible here.
          // Instead, we should rely on the global logout callback if set.
          if (typeof onLogoutCallback === "function") {
            onLogoutCallback();
          } else {
            console.warn("onLogoutCallback not set in ProfileScreen.");
          }
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error("ProfileScreen: API response not OK:", errorData);
          throw new Error(errorData.message || "Failed to fetch user profile");
        }

        const data = await response.json();
        console.log("ProfileScreen: Fetched user data:", data);
        setUserData(data.user); // Extract user data from the 'user' key
      } catch (error) {
        console.error("Error fetching user profile:", error);
        Alert.alert("Error", "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text>Could not load user data.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require("../../assets/mockup_banner_header_2.svg")}
        style={styles.headerBackground}
        resizeMode="cover"
        imageStyle={{
          width: "100%",
          height: "100%",
        }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>User Profile</Text>
        </View>
      </ImageBackground>

      <ScrollView style={styles.scrollViewContent}>
        <View style={styles.profileCard}>
          <Text style={styles.label}>
            ID: <Text style={styles.value}>{userData.id}</Text>
          </Text>
          <Text style={styles.label}>
            Fullname: <Text style={styles.value}>{userData.full_name}</Text>
          </Text>
          <Text style={styles.label}>
            Email: <Text style={styles.value}>{userData.email}</Text>
          </Text>
          <Text style={styles.label}>
            Role: <Text style={styles.value}>{userData.role}</Text>
          </Text>
          {/* Add more user data fields as needed */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNavigation navigation={navigation} activeScreen="Profile" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  headerBackground: {
    backgroundColor: "#666",
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20, // Adjust as needed for status bar
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 10,
  },
  profileCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  value: {
    fontWeight: "normal",
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: "#ff6347",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignSelf: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    zIndex: 1,
  },
  scrollViewContent: {
    flex: 1,
  },
});

export default ProfileScreen;
