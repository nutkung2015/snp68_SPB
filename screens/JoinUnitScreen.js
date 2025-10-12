import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Assuming you have @expo/vector-icons installed
import { setNavigation } from '../screens/services/authService'; // Adjust path as needed
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const JoinUnitScreen = () => {
  const [invitationCode, setInvitationCode] = useState('');
  const navigation = useNavigation();

  // Set the navigation object to authService
  React.useEffect(() => {
    setNavigation(navigation);
  }, [navigation]);

  const handleJoinProject = () => {
    // Here you would typically call your API to join the unit/project
    // using the invitationCode
    console.log('Joining project with code:', invitationCode);
    // Example: call an API function
    // joinUnitAPI(invitationCode);
    // After successful join, you might navigate to the main app screen
    // navigation.navigate('MainAppScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <Ionicons name="happy-outline" size={30} color="white" style={styles.smileyIcon} />
          <Text style={styles.headerText}>บริการดีครบครันเป็นกันเองต้องที่</Text>
          <Text style={styles.headerTitle}>“เสียงเพื่อนบ้าน”</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.instructionTitle}>กรอกรหัสคำเชิญ</Text>
        <Text style={styles.instructionSubtitle}>กรอกรหัสคำเชิญเพื่อเข้าสู่โครงการ</Text>

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

        <Text style={styles.footerText}>
          ถ้าหากคุณไม่มีคิวอาร์โค้ดหรือรหัสคำเชิญ
        </Text>
        <Text style={styles.footerText}>
          โปรดติดต่อที่นิติบุคคล
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBackground: {
    width: '100%',
    height: height * 0.3, // Adjust height as needed
    backgroundColor: '#8BC34A', // Placeholder for gradient, adjust to match your gradient
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  smileyIcon: {
    marginBottom: 10,
  },
  headerText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 5,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  instructionSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#4CAF50', // Green button color
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default JoinUnitScreen;