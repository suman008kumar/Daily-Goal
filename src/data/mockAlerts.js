import {
  ALERT_TYPES,
  ALERT_LEVELS,
} from "../utils/constants";

const createTimestamp = (minutesAgo = 0) => {
  return Date.now() - minutesAgo * 60 * 1000;
};

export const mockAlerts = [
  {
    id: "demo-alert-001",
    type: ALERT_TYPES.PHONE,
    level: ALERT_LEVELS.WARNING,
    title: "Phone detected",
    message: "A phone was detected during the study session.",
    timestamp: createTimestamp(4),
    resolved: false,
    dismissed: false,
  },
  {
    id: "demo-alert-002",
    type: ALERT_TYPES.LOOKING_AWAY,
    level: ALERT_LEVELS.INFO,
    title: "Attention shifted",
    message: "Your attention appears to be away from the study area.",
    timestamp: createTimestamp(12),
    resolved: true,
    dismissed: false,
  },
  {
    id: "demo-alert-003",
    type: ALERT_TYPES.DROWSY,
    level: ALERT_LEVELS.WARNING,
    title: "You look tired",
    message: "Take a short break if you are feeling tired.",
    timestamp: createTimestamp(21),
    resolved: true,
    dismissed: false,
  },
  {
    id: "demo-alert-004",
    type: ALERT_TYPES.FACE_MISSING,
    level: ALERT_LEVELS.WARNING,
    title: "Face not detected",
    message: "Please make sure you are visible to the camera.",
    timestamp: createTimestamp(32),
    resolved: true,
    dismissed: false,
  },
  {
    id: "demo-alert-005",
    type: ALERT_TYPES.MULTIPLE_PERSON,
    level: ALERT_LEVELS.INFO,
    title: "Multiple people detected",
    message: "More than one person was detected in the camera view.",
    timestamp: createTimestamp(46),
    resolved: true,
    dismissed: false,
  },
  {
    id: "demo-alert-006",
    type: ALERT_TYPES.LONG_DISTRACTION,
    level: ALERT_LEVELS.WARNING,
    title: "Long distraction",
    message: "You have been distracted for an extended period.",
    timestamp: createTimestamp(58),
    resolved: true,
    dismissed: false,
  },
];

export const getMockAlerts = () => {
  return mockAlerts.map((alert) => ({
    ...alert,
  }));
};

export default mockAlerts;