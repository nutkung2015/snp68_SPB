// Central API Services Export
// นำเข้า services ทั้งหมดที่สร้างไว้

import ApiService from "./apiService";
import AnnouncementsService from "./announcementsService";
import UserService from "./userService";
import UnitsService from "./unitsService";
import ResidentService from "./residentService";
import GuardService from "./guardService";
import NotificationService from "./notificationService";

// Export ทั้งหมดเพื่อให้ใช้งานง่าย
export {
  ApiService,
  AnnouncementsService,
  UserService,
  UnitsService,
  ResidentService,
  GuardService,
  NotificationService,
};

// Export default object สำหรับการ import แบบ default
export default {
  ApiService,
  AnnouncementsService,
  UserService,
  UnitsService,
  ResidentService,
  GuardService,
  NotificationService,
};

