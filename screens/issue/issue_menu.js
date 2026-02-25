import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomNavigation from "../../components/BottomNavigation";
import ProjectCustomizationsService from "../../services/projectCustomizationsService";

export default function IssueMenuScreen({ navigation }) {
  const [primaryColor, setPrimaryColor] = useState("#2A405E"); // Default color
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
        }
      } catch (error) {
        console.error("Failed to load user data from AsyncStorage", error);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const fetchProjectCustomizations = async () => {
      if (userData?.projectMemberships?.[0]?.project_id) {
        try {
          setLoading(true);
          const response = await ProjectCustomizationsService.getProjectCustomizations(
            userData.projectMemberships[0].project_id
          );
          if (response?.primary_color) {
            setPrimaryColor(response.primary_color);
          }
        } catch (error) {
          console.error("Error fetching project customizations:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchProjectCustomizations();
  }, [userData]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const Card = ({ iconName, title, onPress }) => (
    <LinearGradient
      colors={[primaryColor, primaryColor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={iconName} size={26} color={primaryColor} />
        </View>
        <Text style={styles.cardText}>{title}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="black" />
          <Text style={styles.backButtonText}>ย้อนกลับ</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerSecond}>
        <Text style={styles.headerTitle}>แจ้งปัญหา/ซ่อมแซม</Text>
      </View>

      {/* Content Cards */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={styles.loadingText}>กำลังโหลด...</Text>
          </View>
        ) : (
          <>
            <Card
              iconName="alert-circle-outline"
              title="แจ้งซ่อมบ้าน"
              onPress={() => navigation.navigate('PersonalIssue')}
            />
            <Card
              iconName="list-outline"
              title="แจ้งปัญหาส่วนกลาง"
              onPress={() => navigation.navigate('CommonIssue')}
            />
            {/* <Card
              iconName="time-outline"
              title="ประวัติการแจ้งปัญหา"
              onPress={() => navigation.navigate('IssueHistory')}
            /> */}
          </>
        )}
      </View>
      {/* <BottomNavigation navigation={navigation} activeScreen="IssueMenu" /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  headerSecond: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 4,
    fontFamily: "NotoSansThai_400Regular",
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "start",
    marginRight: 24,
    fontFamily: "NotoSansThai_600SemiBold",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontFamily: "NotoSansThai_400Regular",
  },
  cardGradient: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: {
    flex: 1,
    fontSize: 20,
    marginLeft: 16,
    color: "white",
    fontFamily: "NotoSansThai_600SemiBold",
  },
});
