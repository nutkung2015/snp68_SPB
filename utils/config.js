import Constants from "expo-constants";

const ENV = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

// API Configuration สำหรับ Expo App
export const API_CONFIG = {
  // เลือก API URL ตาม environment
  BASE_URL:
    ENV.APP_ENV === "production"
      ? ENV.PROD_API_BASE_URL || "https://snp68-spb.onrender.com"
      : ENV.DEV_API_BASE_URL || "http://127.0.0.1:5000",
  VERSION: ENV.API_VERSION || "v1",
};

// http://127.0.0.1:5000
// https://waggly-brantlee-nonvehemently.ngrok-free.dev
// http://220.127.116.11:5000
// http://localhost:5000

// Authentication Configuration
// NOTE: JWT_SECRET should NEVER be in frontend code - it's only used in backend
export const AUTH_CONFIG = {
  // These are not actually used in frontend, kept for reference only
  JWT_EXPIRES_IN: ENV.JWT_EXPIRES_IN || "7d",
};

// External Services สำหรับ Expo
// NOTE: API_SECRET should NEVER be in frontend code - uploads go through backend
export const EXTERNAL_SERVICES = {
  CLOUDINARY: {
    CLOUD_NAME: ENV.CLOUDINARY_CLOUD_NAME || "dwsl5h6a7",
    // API_KEY and API_SECRET removed - all uploads go through backend
  },
  FIREBASE: {
    // Public Firebase config (these are meant to be public)
    API_KEY: ENV.FIREBASE_API_KEY,
    AUTH_DOMAIN: ENV.FIREBASE_AUTH_DOMAIN,
    PROJECT_ID: ENV.FIREBASE_PROJECT_ID,
    STORAGE_BUCKET: ENV.FIREBASE_STORAGE_BUCKET,
    MESSAGING_SENDER_ID: ENV.FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: ENV.FIREBASE_APP_ID,
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
  PROJECT_ID: ENV.EXPO_PROJECT_ID,
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
  // ใช้ API_CONFIG.BASE_URL ที่ตั้งค่าไว้แล้ว
  return API_CONFIG.BASE_URL;
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
