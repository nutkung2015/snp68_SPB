import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const BottomNavigation = ({ navigation, activeScreen }) => {
  return (
    <View style={styles.bottomNav}>
      <LinearGradient
        colors={Platform.OS === 'web' 
          ? ["rgba(75, 181, 159, 0.9)", "rgba(255, 216, 64, 0.9)"]
          : ["#4bb59f", "#ffd840"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientCard}
      >
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons
            name="home"
            size={24}
            color={activeScreen === "Home" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "Home" && { color: "#205248" },
            ]}
          >
            หน้าหลัก
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Services")}
        >
          <Ionicons
            name="grid"
            size={24}
            color={activeScreen === "Services" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "Services" && { color: "#205248" },
            ]}
          >
            บริการ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Chat")}
        >
          <Ionicons
            name="chatbubble"
            size={24}
            color={activeScreen === "Chat" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "Chat" && { color: "#205248" },
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

// New version with solid color background
const BottomNavigationNew = ({ navigation, activeScreen }) => {
  return (
    <View style={[styles.bottomNav, styles.solidBackground]}>
      <View style={styles.navContainer}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons
            name="home"
            size={24}
            color={activeScreen === "Home" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "Home" && { color: "#205248" },
            ]}
          >
            หน้าหลัก
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Services")}
        >
          <Ionicons
            name="grid"
            size={24}
            color={activeScreen === "Services" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "Services" && { color: "#205248" },
            ]}
          >
            บริการ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Chat")}
        >
          <Ionicons
            name="chatbubble"
            size={24}
            color={activeScreen === "Chat" ? "#205248" : "#fff"}
          />
          <Text
            style={[
              styles.navText,
              activeScreen === "Chat" && { color: "#205248" },
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    height: '10%',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4bb59f',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  solidBackground: {
    backgroundColor: '#4bb59f',
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  gradientCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,

    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderTopWidth: 0,
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

export default BottomNavigationNew;
