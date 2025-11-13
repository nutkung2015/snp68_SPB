import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomNavigation from "../../components/BottomNavigation";

export default function IssueMenuScreen({ navigation }) {
  const handleGoBack = () => {
    navigation.goBack();
  };

  const Card = ({ iconName, title, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={26} color="#205248" />
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
        <Text style={styles.headerTitle}>แจ้งปัญหา/ซ่อมแซม</Text>
      </View>

      {/* Content Cards */}
      <View style={styles.content}>
        <Card
          iconName="alert-circle-outline"
          title="แจ้งซ่อมบ้าน"
          onPress={() => navigation.navigate('PersonalIssue')}
        />
        <Card
          iconName="list-outline"
          title="แจ้งปัญหาปัญหาส่วนกลาง"
          onPress={() => navigation.navigate('IssueList')}
        />
        {/* <Card
          iconName="time-outline"
          title="ประวัติการแจ้งปัญหา"
          onPress={() => navigation.navigate('IssueHistory')}
        /> */}
      </View>
      <BottomNavigation navigation={navigation} activeScreen="IssueMenu" />
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
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "start",
    marginRight: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4BB59F",
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
    fontSize: 20,
    marginLeft: 12,
    color: "white",
    fontFamily: "Kanit_600SemiBold",
  },
});
