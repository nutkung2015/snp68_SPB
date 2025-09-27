import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import {
  useFonts,
  Kanit_400Regular,
  Kanit_500Medium,
  Kanit_600SemiBold,
  Kanit_700Bold,
} from '@expo-google-fonts/kanit';
import * as SplashScreen from 'expo-splash-screen';

// import หน้าจอทั้งหมด
import NeighborhoodEmotionsScreen from './screens/NeighborhoodEmotionsScreen';
import HomeScreen from './screens/HomeScreen';
import ServiceScreen from './screens/ServiceScreen';
import NewsScreen from './screens/news/NewsScreen';
import NewsDetailScreen from './screens/news/NewsDetailScreen';

// เพิ่ม defaultProps สำหรับ Text component
Text.defaultProps = {
  ...Text.defaultProps,
  style: { fontFamily: 'Kanit_400Regular' }
};

TextInput.defaultProps = {
  ...TextInput.defaultProps,
  style: { fontFamily: 'Kanit_400Regular' }
};

const Stack = createNativeStackNavigator();

// function HomeScreen({ navigation }) {
//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'navy' }}>
//       <Text style={{ fontSize: 24, textAlign: 'center', color: 'white', marginBottom: 24 }}>
//         hello world{"\n"}how are you to day?
//       </Text>
//       <Button title="Go to Login" onPress={() => navigation.navigate('Login')} color="#fff" />
//     </View>
//   );
// }

function LoginScreen() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const handleLogin = () => {
    // mock user
    const mockUser = {
      username: 'test',
      password: '1234'
    };

    if (username === mockUser.username && password === mockUser.password) {
      // Clear any previous error
      setError('');
      // Navigate to NeighborhoodEmotions screen
      navigation.navigate('Home');
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.loginTitle}>Login</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => {
          setUsername('test');
          setPassword('1234');
        }}
      >
        <Text style={styles.registerButtonText}>ใส่ข้อมูลทดสอบ</Text>
      </TouchableOpacity>

      {/* <View style={styles.helpText}>
        <Text style={styles.helpTextContent}>
          ชื่อผู้ใช้: test{'\n'}
          รหัสผ่าน: 1234
        </Text>
      </View> */}
    </View>
  );
}

export default function App() {

  // โหลด fonts
  let [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_600SemiBold,
    Kanit_700Bold,
  });

  // ป้องกัน app render ก่อน fonts โหลดเสร็จ
  React.useEffect(() => {
    async function prepare() {
      await SplashScreen.preventAutoHideAsync();
    }
    prepare();
  }, []);

  if (!fontsLoaded) {
    return null;
  } else {
    SplashScreen.hideAsync();
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Services" component={ServiceScreen} />
        <Stack.Screen name="NeighborhoodEmotions" component={NeighborhoodEmotionsScreen} />
        <Stack.Screen name="News" component={NewsScreen} />
        <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a174e',
    padding: 24,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    marginBottom: 16,
    color: '#222',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  loginButton: {
    width: '100%',
    maxWidth: 320,
    height: 48,
    backgroundColor: '#1e90ff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#1e90ff',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  registerButton: {
    width: '100%',
    maxWidth: 320,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1e90ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  registerButtonText: {
    color: '#1e90ff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  helpText: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  helpTextContent: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  }
}); 