import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomNavigation from "../../components/BottomNavigation";

export default function VilageOptionScreen({ navigation }) {
  const handleGoBack = () => {
    navigation.goBack();
  };

  const Card = ({ iconName, title, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <FontAwesome name={iconName} size={26} color="#205248" />
      </View>
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>ข้อมูลพื้นฐาน</Text>
      </View>

      {/* Content Cards */}
      <View style={styles.content}>
        <Card
          iconName="info-circle"
          title="รายละเอียดโครงการ"
          onPress={() => console.log("รายละเอียดบ้าน pressed")}
        />
        <Card
          iconName="file-pdf-o"
          title="กฏระเบียบและข้อบังคับ"
          onPress={() => console.log("การต่อเติมบ้าน pressed")}
        />
      </View>
      <BottomNavigation navigation={navigation} activeScreen="VilageOption" />
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
    // borderBottomWidth: 1,
    // borderBottomColor: "#eee",
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
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "start",
    marginRight: 24, // Offset for back button
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4BB59F",
    // padding: 16,\n
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: {
    fontSize: 16,
    marginLeft: 12,
    // color: "#205248",
    color: "white",
    fontFamily: "Kanit_600SemiBold",
    fontSize: 20,
  },
  bottomNavigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 60,
    paddingBottom: 5, // For SafeAreaView on iOS
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navButtonText: {
    color: "white",
    fontSize: 10,
    marginTop: 4,
  },
});
