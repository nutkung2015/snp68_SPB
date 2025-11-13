import Constants from "expo-constants";

const ENV = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

// API Configuration สำหรับ Expo App
export const API_CONFIG = {
  // เลือก API URL ตาม environment
  BASE_URL:
    ENV.APP_ENV === "production"
      ? ENV.PROD_API_BASE_URL || "https://your-production-api.com"
      : ENV.DEV_API_BASE_URL || ENV.API_BASE_URL || "http://127.0.0.1:5000",
  // อย่าลืมเปลี่ยนกลับถ้าใช้ ngrok
  VERSION: ENV.API_VERSION || "v1",
};

// http://127.0.0.1:5000
// https://waggly-brantlee-nonvehemently.ngrok-free.dev
// http://220.127.116.11:5000
// http://localhost:5000

// Authentication Configuration
export const AUTH_CONFIG = {
  JWT_SECRET: ENV.JWT_SECRET || "96820937f7b0918d2a562bf080cdb2c2",
  JWT_EXPIRES_IN: ENV.JWT_EXPIRES_IN || "7d",
};

// External Services สำหรับ Expo
export const EXTERNAL_SERVICES = {
  CLOUDINARY: {
    CLOUD_NAME: ENV.CLOUDINARY_CLOUD_NAME || "dwsl5h6a7",
    API_KEY: ENV.CLOUDINARY_API_KEY || "645229893171672",
    API_SECRET: ENV.CLOUDINARY_API_SECRET || "uHv5zGR6t6LHCx2X0m8Rri7QOBE",
  },
  FIREBASE: {
    API_KEY: ENV.FIREBASE_API_KEY || "AIzaSyCASlOXSaGEnZJFsL3eXwX6PV11SH1DTbY",
    AUTH_DOMAIN: ENV.FIREBASE_AUTH_DOMAIN || "snp68spb.firebaseapp.com",
    PROJECT_ID: ENV.FIREBASE_PROJECT_ID || "snp68spb",
    STORAGE_BUCKET:
      ENV.FIREBASE_STORAGE_BUCKET || "snp68spb.firebasestorage.app",
    MESSAGING_SENDER_ID: ENV.FIREBASE_MESSAGING_SENDER_ID || "58142314237",
    APP_ID: ENV.FIREBASE_APP_ID || "1:58142314237:web:3330e67fd38c87147db894",
    MEASUREMENT_ID: ENV.FIREBASE_MEASUREMENT_ID || "G-B12DN0C3YQ",
  },
};

// App Configuration สำหรับ Expo
export const APP_CONFIG = {
  ENV: ENV.APP_ENV || "development",
  NAME: ENV.APP_NAME || "SiengPuenBan",
  VERSION: ENV.APP_VERSION || "1.0.0",
  DEBUG: ENV.DEBUG === "true" || false,
};

// Push Notifications สำหรับ Expo
export const PUSH_CONFIG = {
  PROJECT_ID: ENV.EXPO_PROJECT_ID || "7c6d8598-fa21-4f26-ab88-eb019a0d52b7",
};

// Social Authentication (ถ้าต้องการ)
export const SOCIAL_AUTH = {
  GOOGLE_CLIENT_ID: ENV.GOOGLE_CLIENT_ID || "your-google-client-id",
  FACEBOOK_APP_ID: ENV.FACEBOOK_APP_ID || "your-facebook-app-id",
};

// Maps API สำหรับ Expo
export const MAPS_CONFIG = {
  GOOGLE_MAPS_API_KEY: ENV.GOOGLE_MAPS_API_KEY || "your-google-maps-api-key",
};

// Analytics สำหรับ Expo
export const ANALYTICS_CONFIG = {
  GOOGLE_ANALYTICS_ID: ENV.GOOGLE_ANALYTICS_ID || "your-ga-tracking-id",
};

// File Upload Configuration สำหรับ Expo
export const FILE_CONFIG = {
  MAX_SIZE: parseInt(ENV.MAX_FILE_SIZE) || 10485760, // 10MB
  ALLOWED_TYPES: ENV.ALLOWED_FILE_TYPES?.split(",") || [
    "jpg",
    "jpeg",
    "png",
    "pdf",
    "doc",
    "docx",
  ],
};

// Chat API สำหรับ Expo
export const CHAT_CONFIG = {
  API_KEY: ENV.CHAT_API_KEY || "your-chat-api-key",
  API_SECRET: ENV.CHAT_API_SECRET || "your-chat-api-secret",
};

// Emergency API สำหรับ Expo
export const EMERGENCY_CONFIG = {
  API_URL: ENV.EMERGENCY_API_URL || "https://api.emergency-services.com",
};

// Weather API สำหรับ Expo
export const WEATHER_CONFIG = {
  API_KEY: ENV.WEATHER_API_KEY || "your-weather-api-key",
  API_URL: ENV.WEATHER_API_URL || "https://api.weatherapi.com/v1",
};

// Helper Functions สำหรับ Expo
export const getApiBaseUrl = () => {
  // Use environment variable if available (for production)
  if (ENV.API_BASE_URL) {
    return ENV.API_BASE_URL;
  }

  // For Expo development - use localhost with tunnel
  return "http://127.0.0.1:5000";
};

export const getApiUrl = (endpoint) => {
  return `${getApiBaseUrl()}/api/${API_CONFIG.VERSION}${endpoint}`;
};

// ตรวจสอบว่าเป็น Development mode หรือไม่
export const isDevelopment = () => {
  return APP_CONFIG.ENV === "development";
};

// ตรวจสอบว่าเปิด Debug mode หรือไม่
export const isDebugMode = () => {
  return APP_CONFIG.DEBUG;
};

// สร้าง Headers สำหรับ API requests
export const getApiHeaders = (token) => {
  console.log("Setting headers with token:", token);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default {
  API_CONFIG,
  AUTH_CONFIG,
  EXTERNAL_SERVICES,
  APP_CONFIG,
  PUSH_CONFIG,
  SOCIAL_AUTH,
  MAPS_CONFIG,
  ANALYTICS_CONFIG,
  FILE_CONFIG,
  CHAT_CONFIG,
  EMERGENCY_CONFIG,
  WEATHER_CONFIG,
  getApiBaseUrl,
  getApiUrl,
  isDevelopment,
  isDebugMode,
  getApiHeaders,
};
