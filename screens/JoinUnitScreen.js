import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  ImageBackground,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Assuming you have @expo/vector-icons installed
import { setNavigation } from "../services/authService"; // Adjust path as needed
import { logout } from "../services/authService";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UnitsService } from "../services";

const { width, height } = Dimensions.get("window");

const JoinUnitScreen = () => {
  const [invitationCode, setInvitationCode] = useState("");
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();

  // Set the navigation object to authService
  React.useEffect(() => {
    setNavigation(navigation);
  }, [navigation]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
          console.log("Loaded userData:", JSON.parse(storedUserData));
        }
      } catch (error) {
        console.error("Failed to load user data from AsyncStorage", error);
      }
    };
    loadUserData();
  }, []);

  const getInitials = (fullName) => {
    if (!fullName) return "";
    const names = fullName.split(" ");
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
  };

  const handleJoinProject = async () => {
    if (!invitationCode) {
      Alert.alert("Error", "กรุณากรอกรหัสคำเชิญ");
      return;
    }

    try {
      // Get user role from stored userData
      const userRole = userData?.role || userData?.roles?.[0];
      console.log("User role:", userRole);

      let data;

      if (userRole === "security" || userRole === "juristic") {
        // Security and Juristic users join project directly
        console.log("Joining project (security/juristic)...");
        data = await UnitsService.joinProject(invitationCode);

        // Update AsyncStorage with new projectMembership
        const updatedUserData = { ...userData };
        if (!updatedUserData.projectMemberships) {
          updatedUserData.projectMemberships = [];
        }
        updatedUserData.projectMemberships.push({
          project_id: data.project_id,
          project_name: data.project_name,
          role: data.role || userRole
        });
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));
        console.log("Updated userData with new projectMembership:", updatedUserData.projectMemberships);

        Alert.alert(
          "สำเร็จ",
          data.message || "เข้าร่วมโครงการสำเร็จ!"
        );

        // Navigate based on role
        if (userRole === "security") {
          navigation.navigate("GuardHome");
        } else {
          navigation.navigate("Home");
        }
      } else {
        // Resident users join unit (which also adds them to project)
        console.log("Joining unit (resident)...");
        data = await UnitsService.joinUnit(invitationCode);

        Alert.alert(
          "สำเร็จ",
          data.message || "เข้าร่วมโครงการสำเร็จ!"
        );

        navigation.navigate("Home");
      }
    } catch (error) {
      console.error("Error joining:", error);
      Alert.alert("เกิดข้อผิดพลาด", error.message || "กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../assets/banner_header_3.png")}
        style={styles.headerBackground}
        resizeMode="cover"
        imageStyle={{
          // เพิ่ม style สำหรับรูปภาพ
          width: "100%",
          height: "100%",
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {/* <View style={styles.logoContainer}>
              <Image
                source={require("../assets/logo_1.png")}
                style={styles.logoImage}
              />
            </View> */}
          </View>
        </View>
      </ImageBackground>

      <View style={styles.body}>
        <Text style={styles.instructionTitle}>กรอกรหัสคำเชิญ</Text>
        <Text style={styles.instructionSubtitle}>
          กรอกรหัสคำเชิญเพื่อเข้าสู่โครงการ
        </Text>

        <TextInput
          style={styles.input}
          placeholder="รหัสคำเชิญของคุณ..."
          placeholderTextColor="#A0A0A0"
          value={invitationCode}
          onChangeText={setInvitationCode}
        />

        <TouchableOpacity style={styles.button} onPress={handleJoinProject}>
          <Text style={styles.buttonText}>เข้าสู่โครงการ</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>ถ้าหากคุณไม่มีรหัสคำเชิญ</Text>
        <Text style={styles.footerText}>โปรดติดต่อที่นิติบุคคล</Text>
      </View>
      {/* {userData && userData.fullName && ( */}
      <TouchableOpacity
        style={styles.bottomProfileLinkContainer}
        onPress={() => logout(navigation)}
      >
        <Text style={styles.profileLinkText}>ออกจากระบบ</Text>
      </TouchableOpacity>
      {/* )} */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    zIndex: 0, // Ensure SafeAreaView is at the base
  },
  headerBackground: {
    width: "100%",
    height: height * 0.3, // Adjust height as needed
    backgroundColor: "#8BC34A", // Placeholder for gradient, adjust to match your gradient
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: "relative", // Add relative positioning for absolute children
  },
  headerContent: {
    alignItems: "center",
    marginTop: 20,
  },
  smileyIcon: {
    marginBottom: 10,
  },
  headerText: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginTop: 5,
  },
  profileLinkText: {
    paddingTop: "auto",
    color: "gray",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  bottomProfileLinkContainer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    alignItems: "center",
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  instructionSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  input: {
    width: "100%",
    height: 50,
    borderColor: "#E0E0E0",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#4CAF50", // Green button color
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});

export default JoinUnitScreen;
