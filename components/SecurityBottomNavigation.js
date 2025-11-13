import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const SecurityBottomNavigation = ({ navigation, activeScreen }) => {
  return (
    <View style={styles.bottomNav}>
      <LinearGradient
        colors={["rgba(75, 181, 159, 0.9)", "rgba(255, 216, 64, 0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientCard}
      >
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("GuardHome")}
        >
          <Ionicons
            name="home"
            size={24}
            color={activeScreen === "GuardHome" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "GuardHome" && { color: "#205248" },
            ]}
          >
            หน้าหลัก
          </Text>
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("SecurityServices")}
        >
          <Ionicons
            name="grid"
            size={24}
            color={activeScreen === "SecurityServices" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "SecurityServices" && { color: "#205248" },
            ]}
          >
            บริการ
          </Text>
        </TouchableOpacity> */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("SecurityChat")}
        >
          <Ionicons
            name="chatbubble"
            size={24}
            color={activeScreen === "SecurityChat" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "SecurityChat" && { color: "#205248" },
            ]}
          >
            แชท
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons
            name="person"
            size={24}
            color={activeScreen === "Profile" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "Profile" && { color: "#205248" },
            ]}
          >
            โปรไฟล์
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {},
  gradientCard: {
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 12,
    color: "#fff",
    marginTop: 4,
  },
});

export default SecurityBottomNavigation;
