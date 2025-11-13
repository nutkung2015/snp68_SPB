import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomNavigation from "../../components/BottomNavigation";

export default function ListNumberEmergencyScreen({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleCardPress = (emergency) => {
    setSelectedEmergency(emergency);
    setModalVisible(true);
  };

  const handleCall = (phoneNumber) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          console.log("Don't know how to open URI: " + url);
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  const emergencyNumbers = [
    {
      id: '1',
      iconName: "shield-checkmark-outline",
      title: "เหตุด่วนเหตุร้าย",
      phoneNumber: "191",
      description: "แจ้งเหตุด่วน เหตุร้าย ตำรวจ"
    },
    {
      id: '2',
      iconName: "medical-outline",
      title: "กู้ภัยกู้ชีพ",
      phoneNumber: "1669",
      description: "รถพยาบาล ช่วยเหลือผู้ป่วยฉุกเฉิน"
    },
    {
      id: '3',
      iconName: "flame-outline",
      title: "เพลิงไหม้สัตว์เข้าบ้าน",
      phoneNumber: "199",
      description: "แจ้งเหตุเพลิงไหม้สัตว์เข้าบ้าน"
    }
  ];

  const Card = ({ iconName, title, subtitle, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={26} color="#205248" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
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
        <Text style={styles.headerTitle}>เบอร์ฉุกเฉิน</Text>
      </View>

      {/* Content Cards */}
      <View style={styles.content}>
        {emergencyNumbers.map((emergency) => (
          <Card
            key={emergency.id}
            iconName={emergency.iconName}
            title={emergency.title}
            subtitle={emergency.phoneNumber}
            onPress={() => handleCardPress(emergency)}
          />
        ))}
      </View>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEmergency && (
              <>
                <View style={styles.modalHeader}>
                  <Ionicons name={selectedEmergency.iconName} size={40} color="#205248" />
                  <Text style={styles.modalTitle}>{selectedEmergency.title}</Text>
                </View>

                <View style={styles.phoneSection}>
                  <Text style={styles.phoneLabel}>เบอร์โทร</Text>
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={() => handleCall(selectedEmergency.phoneNumber)}
                  >
                    <Text style={styles.phoneNumber}>{selectedEmergency.phoneNumber}</Text>
                    <Ionicons name="call" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.description}>{selectedEmergency.description}</Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>ปิด</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <BottomNavigation navigation={navigation} activeScreen="Emergency" />
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
    // padding: 16,
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
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: "white",
    fontFamily: "Kanit_600SemiBold",
    fontSize: 18,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "white",
    fontSize: 14,
    opacity: 0.9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    margin: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "80%",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#205248",
    marginTop: 10,
  },
  phoneSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  phoneLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4BB59F",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  phoneNumber: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 10,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: "#205248",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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