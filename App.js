import React, { useEffect, useState } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  View,
  Text,
  Button,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import {
  useFonts,
  NotoSansThai_400Regular,
  NotoSansThai_500Medium,
  NotoSansThai_600SemiBold,
  NotoSansThai_700Bold,
} from "@expo-google-fonts/noto-sans-thai";
import * as SplashScreen from "expo-splash-screen";
import {
  setLogoutCallback,
  setNavigation,
} from "./services/authService";
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { EXTERNAL_SERVICES } from "./utils/config";

// import หน้าจอทั้งหมด
import NeighborhoodEmotionsScreen from "./screens/NeighborhoodEmotionsScreen";
import HomeScreen from "./screens/HomeScreen";
import GuardHomeScreen from "./screens/GuardHomeScreen";
import ServiceScreen from "./screens/ServiceScreen";
import NewsScreen from "./screens/news/NewsScreen";
import NewsDetailScreen from "./screens/news/NewsDetailScreen";
import LoginScreen from "./screens/login/LoginScreen";
import RegisterScreen from "./screens/register/RegisterScreen";
import ProfileScreen from "./screens/profile/ProfileScreen";
import JoinUnitScreen from "./screens/่joint-unit/JoinUnitScreen";
import JointByCode from "./screens/่joint-unit/jointByCode";
import JointByQRcode from "./screens/่joint-unit/jointByQRcode";
import HomeOptionScreen from "./screens/Myhome/HomeOptionScreen";
import VilageOptionScreen from "./screens/MyVilage/VilageOption";
import NumberEmergencyScreen from "./screens/number_emergency/list_number_emergency";
import IssueMenuScreen from "./screens/issue/issue_menu";
import PersonalIssueScreen from "./screens/issue/personal_issue/personal_issue";
import AddIssueForm from "./screens/issue/personal_issue/AddIssueForm";
import PersonalIssueDetailScreen from "./screens/issue/personal_issue/personal_issue_detail";
import CommonIssueScreen from "./screens/issue/common_issue/common_issue";
import AddCommonIssueForm from "./screens/issue/common_issue/AddCommonIssueForm";
import CommonIssueDetailScreen from "./screens/issue/common_issue/common_issue_detail";
import HouseDetailScreen from "./screens/Myhome/HouseDetailScreen";
import HousePlanScreen from "./screens/Myhome/HousePlanScreen";
import HomeInfoOptionScreen from "./screens/Myhome/HomeInfoOptionScreen";
import VilageRuleScreen from "./screens/MyVilage/VilageRuleScreen";
import VilageDetailScreen from "./screens/MyVilage/VilageDetailScreen";
import ResidentManageScreen from "./screens/residentManageUser/residentManageScreen";
import ChangePasswordScreen from "./screens/้ChangePasswordScreen/ChangePasswordScreen";
import VehiclesResidentsScreen from "./screens/vehicles-residents/vehicles-residents";
import UnitEntryHistoryScreen from "./screens/unit-entry-history/unit-entry-history";
import InvitationHistoryScreen from "./screens/invitation-history/InvitationHistoryScreen";

// Security screens
import SecurityServiceScreen from "./screens/security/SecurityServiceScreen";
import SecurityProfileScreen from "./screens/security/SecurityProfileScreen";

// Visitor Management
import EstampScreen from "./screens/visitors/EstampScreen";
import GuardDashboardScreen from "./screens/guard/GuardDashboardScreen";
import GuardCheckInScreen from "./screens/guard/GuardCheckInScreen";
import EntryHistoryScreen from "./screens/guard/EntryHistoryScreen";

// Notifications
import NotificationScreen from "./screens/NotificationScreen";



// เพิ่ม defaultProps สำหรับ Text component
Text.defaultProps = {
  ...Text.defaultProps,
  style: { fontFamily: "NotoSansThai_400Regular" },
};

TextInput.defaultProps = {
  ...TextInput.defaultProps,
  style: { fontFamily: "NotoSansThai_400Regular" },
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

// function LoginScreen() {
//   const [username, setUsername] = React.useState('');
//   const [password, setPassword] = React.useState('');
//   const [error, setError] = React.useState('');
//   const handleLogin = () => {
//     // mock user
//     const mockUser = {
//       username: 'test',
//       password: '1234'
//     };

//     if (username === mockUser.username && password === mockUser.password) {
//       // Clear any previous error
//       setError('');
//       // Navigate to NeighborhoodEmotions screen
//       navigation.navigate('Home');
//     } else {
//       setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
//     }
//   };

//   return (
//     <View style={styles.loginContainer}>
//       <Text style={styles.loginTitle}>Login</Text>

//       {error ? <Text style={styles.errorText}>{error}</Text> : null}
//       <TextInput
//         style={styles.input}
//         placeholder="Username"
//         placeholderTextColor="#aaa"
//         value={username}
//         onChangeText={setUsername}
//         autoCapitalize="none"
//       />
//       <TextInput
//         style={styles.input}
//         placeholder="Password"
//         placeholderTextColor="#aaa"
//         value={password}
//         onChangeText={setPassword}
//         secureTextEntry
//       />
//       <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
//         <Text style={styles.loginButtonText}>Login</Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={styles.registerButton}
//         onPress={() => {
//           setUsername('test');
//           setPassword('1234');
//         }}
//       >
//         <Text style={styles.registerButtonText}>ใส่ข้อมูลทดสอบ</Text>
//       </TouchableOpacity>

//       {/* <View style={styles.helpText}>
//         <Text style={styles.helpTextContent}>
//           ชื่อผู้ใช้: test{'\n'}
//           รหัสผ่าน: 1234
//         </Text>
//       </View> */}
//     </View>
//   );
// }

// Initialize Firebase outside component
import { getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: EXTERNAL_SERVICES.FIREBASE.API_KEY,
  authDomain: EXTERNAL_SERVICES.FIREBASE.AUTH_DOMAIN,
  projectId: EXTERNAL_SERVICES.FIREBASE.PROJECT_ID,
  storageBucket: EXTERNAL_SERVICES.FIREBASE.STORAGE_BUCKET,
  messagingSenderId: EXTERNAL_SERVICES.FIREBASE.MESSAGING_SENDER_ID,
  appId: EXTERNAL_SERVICES.FIREBASE.APP_ID,
  measurementId: EXTERNAL_SERVICES.FIREBASE.MEASUREMENT_ID,
};

// Initialize Firebase only once
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
export const db = getFirestore(app);

// Create navigation ref for navigation outside components
const navigationRef = createNavigationContainerRef();

export default function App() {

  // โหลด fonts
  let [fontsLoaded] = useFonts({
    NotoSansThai_400Regular,
    NotoSansThai_500Medium,
    NotoSansThai_600SemiBold,
    NotoSansThai_700Bold,
  });

  if (!fontsLoaded) {
    return null; // หรือแสดง Splash Screen
  }

  // Define RootNavigator as an inner component
  function RootNavigator() {
    // Note: Don't use useNavigation() here as it can cause timing issues
    // Instead, we use navigationRef with onReady callback in NavigationContainer

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState("Login"); // Default initial route
    const [userRole, setUserRole] = useState(null); // Track user role
    const pendingRouteRef = React.useRef(null); // Store route to navigate after role change

    // NOTE: Removed auto-navigate useEffect that caused "navigation not initialized" error
    // Stack.Navigator already handles initial route via initialRouteName prop

    const recheckLoginStatus = async () => {
      try {
        const rawUserData = await AsyncStorage.getItem("userData");
        const parsedUserData = rawUserData ? JSON.parse(rawUserData) : null;
        const token = parsedUserData?.token;
        setIsLoggedIn(!!token);

        let targetRoute = "Login";
        let targetRole = null;

        if (token) {
          console.log("Token exists, checking user data...");
          if (parsedUserData) {
            // Check user role for Security
            const role = parsedUserData.role || parsedUserData.roles?.[0];
            targetRole = role;

            // Check memberships for all users
            const hasProjectMembership =
              parsedUserData.projectMemberships &&
              parsedUserData.projectMemberships.length > 0;
            const hasUnitMembership =
              parsedUserData.unitMemberships &&
              parsedUserData.unitMemberships.length > 0;

            if (role === "security") {
              if (hasProjectMembership) {
                console.log("Security user has project membership. Setting route to GuardHome");
                targetRoute = "GuardHome";
              } else {
                console.log("Security user missing project membership. Setting route to JoinUnitScreen");
                targetRoute = "JoinUnitScreen";
              }
            } else {
              if (hasProjectMembership && hasUnitMembership) {
                targetRoute = "Home";
              } else {
                targetRoute = "JoinUnitScreen";
              }
            }
          } else {
            console.warn("Token exists but no userData found in AsyncStorage.");
            targetRoute = "Login";
          }
        } else {
          targetRoute = "Login";
          targetRole = null;
        }

        setInitialRoute(targetRoute);

        // If role is changing, we need to wait for the correct Stack to render first
        // Store pending route and let useEffect handle navigation after re-render
        if (targetRole !== userRole) {
          pendingRouteRef.current = targetRoute;
          setUserRole(targetRole);
          // Navigation will happen in the useEffect below after Stack re-renders
        } else {
          // Same role - navigator already has the correct routes, navigate now
          if (navigationRef.isReady()) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: targetRoute }],
            });
          }
        }

      } catch (e) {
        console.error(
          "Failed to load auth token or user data from AsyncStorage",
          e
        );
        setIsLoggedIn(false);
        setInitialRoute("Login");
      } finally {
        setLoading(false);
      }
    };

    // Navigate after userRole changes and the correct Stack Navigator has rendered
    useEffect(() => {
      if (pendingRouteRef.current && navigationRef.isReady()) {
        // Small delay to ensure the new Stack Navigator is mounted
        const timer = setTimeout(() => {
          if (pendingRouteRef.current && navigationRef.isReady()) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: pendingRouteRef.current }],
            });
            pendingRouteRef.current = null;
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [userRole]);

    useEffect(() => {
      recheckLoginStatus(); // Call it once on mount

      // ตั้งค่า callback สำหรับการ logout
      setLogoutCallback(() => {
        setIsLoggedIn(false);
        setUserRole(null); // Clear user role
        // When logging out, reset initialRoute to Login and navigate
        setInitialRoute("Login");
        if (navigationRef.isReady()) {
          navigationRef.navigate("Login");
        }
      });
    }, []);

    if (loading) {
      // Show splash screen or loading indicator while determining initial route
      return null; // หรือแสดง Splash Screen
    }

    // Render different stack navigators based on user role
    if (userRole === "security") {
      // Security Stack Navigator - Only security-related screens
      return (
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRoute}
        >
          <Stack.Screen name="JoinUnitScreen" component={JoinUnitScreen} />
          <Stack.Screen name="JointByCode" component={JointByCode} />
          <Stack.Screen name="JointByQRcode" component={JointByQRcode} />
          <Stack.Screen name="GuardHome" component={GuardHomeScreen} />
          <Stack.Screen name="SecurityServices" component={SecurityServiceScreen} />
          <Stack.Screen name="Profile">
            {(props) => (
              <SecurityProfileScreen {...props} recheckLoginStatus={recheckLoginStatus} />
            )}
          </Stack.Screen>
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen {...props} recheckLoginStatus={recheckLoginStatus} />
            )}
          </Stack.Screen>

          {/* Visitor Management (Guard) */}
          <Stack.Screen name="GuardDashboard" component={GuardDashboardScreen} />
          <Stack.Screen
            name="GuardCheckIn"
            component={GuardCheckInScreen}
            options={{ presentation: 'transparentModal', headerShown: false }}
          />
          <Stack.Screen name="EntryHistory" component={EntryHistoryScreen} />

          {/* Issue Management for Guard */}
          <Stack.Screen name="IssueMenu" component={IssueMenuScreen} />
          <Stack.Screen
            name="CommonIssue"
            component={CommonIssueScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddCommonIssue"
            component={AddCommonIssueForm}
            options={{
              headerShown: false,
              presentation: 'modal',
              cardOverlayEnabled: true,
              cardStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="CommonIssueDetail"
            component={CommonIssueDetailScreen}
            options={{ headerShown: false }}
          />

          {/* Emergency Contact */}
          <Stack.Screen name="NumberEmergency" component={NumberEmergencyScreen} />

          {/* Notifications */}
          <Stack.Screen name="Notifications" component={NotificationScreen} />
        </Stack.Navigator>
      );
    } else {
      // Resident Stack Navigator - Only resident-related screens
      return (
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRoute}
        >
          <Stack.Screen name="JoinUnitScreen" component={JoinUnitScreen} />
          <Stack.Screen name="JointByCode" component={JointByCode} />
          <Stack.Screen name="JointByQRcode" component={JointByQRcode} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Services" component={ServiceScreen} />
          <Stack.Screen
            name="NeighborhoodEmotions"
            component={NeighborhoodEmotionsScreen}
          />
          <Stack.Screen name="Profile">
            {(props) => (
              <ProfileScreen {...props} recheckLoginStatus={recheckLoginStatus} />
            )}
          </Stack.Screen>
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="News" component={NewsScreen} />
          <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen {...props} recheckLoginStatus={recheckLoginStatus} />
            )}
          </Stack.Screen>
          <Stack.Screen name="Register" component={RegisterScreen} />

          {/* home */}
          <Stack.Screen name="HomeOption" component={HomeOptionScreen} />
          {/* vilage */}
          <Stack.Screen name="VilageOption" component={VilageOptionScreen} />
          {/* number emergency */}
          <Stack.Screen name="NumberEmergency" component={NumberEmergencyScreen} />
          <Stack.Screen name="IssueMenu" component={IssueMenuScreen} />
          <Stack.Screen
            name="PersonalIssue"
            component={PersonalIssueScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddIssue"
            component={AddIssueForm}
            options={{
              headerShown: false,
              presentation: 'modal',
              cardOverlayEnabled: true,
              cardStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="IssueDetail"
            component={PersonalIssueDetailScreen}
            options={{ headerShown: false }}
          />

          {/* Common Issues */}
          <Stack.Screen
            name="CommonIssue"
            component={CommonIssueScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddCommonIssue"
            component={AddCommonIssueForm}
            options={{
              headerShown: false,
              presentation: 'modal',
              cardOverlayEnabled: true,
              cardStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="CommonIssueDetail"
            component={CommonIssueDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="HouseDetail" component={HouseDetailScreen} />
          <Stack.Screen name="HousePlan" component={HousePlanScreen} />
          <Stack.Screen name="HomeInfoOption" component={HomeInfoOptionScreen} />
          <Stack.Screen name="VilageRule" component={VilageRuleScreen} />
          <Stack.Screen name="VilageDetail" component={VilageDetailScreen} />

          {/* Visitor Management (Resident) */}
          <Stack.Screen name="Estamp" component={EstampScreen} />

          <Stack.Screen name="ResidentManage" component={ResidentManageScreen} />

          {/* Notifications */}
          <Stack.Screen name="Notifications" component={NotificationScreen} />

          <Stack.Screen name="VehiclesResidents" component={VehiclesResidentsScreen} />

          <Stack.Screen name="UnitEntryHistory" component={UnitEntryHistoryScreen} />

          <Stack.Screen name="InvitationHistory" component={InvitationHistoryScreen} />

        </Stack.Navigator>
      );
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            // Set navigation only when NavigationContainer is ready
            setNavigation(navigationRef);
          }}
        >
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a174e",
    padding: 24,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 32,
  },
  input: {
    width: "100%",
    maxWidth: 320,
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    marginBottom: 16,
    color: "#222",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  loginButton: {
    width: "100%",
    maxWidth: 320,
    height: 48,
    backgroundColor: "#1e90ff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
    shadowColor: "#1e90ff",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  registerButton: {
    width: "100%",
    maxWidth: 320,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#1e90ff",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  registerButtonText: {
    color: "#1e90ff",
    fontSize: 20,
    fontWeight: "bold",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  helpText: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  helpTextContent: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
});
