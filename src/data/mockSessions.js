import { SESSION_STATUS } from "../utils/constants";

const minutesToSeconds = (minutes) => minutes * 60;

const createSessionDate = (daysAgo, hour, minute) => {
  const date = new Date();

  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);

  return date;
};

export const mockSessions = [
  {
    id: "demo-session-001",
    date: createSessionDate(0, 9, 15).toISOString(),
    startTime: createSessionDate(0, 9, 15).toISOString(),
    endTime: createSessionDate(0, 10, 18).toISOString(),
    duration: minutesToSeconds(63),
    focusTime: minutesToSeconds(54),
    distractionTime: minutesToSeconds(9),
    phoneTime: minutesToSeconds(3),
    breakTime: 0,
    focusScore: 86,
    distractions: 4,
    status: SESSION_STATUS.COMPLETED,
  },
  {
    id: "demo-session-002",
    date: createSessionDate(0, 14, 0).toISOString(),
    startTime: createSessionDate(0, 14, 0).toISOString(),
    endTime: createSessionDate(0, 14, 52).toISOString(),
    duration: minutesToSeconds(52),
    focusTime: minutesToSeconds(46),
    distractionTime: minutesToSeconds(6),
    phoneTime: minutesToSeconds(2),
    breakTime: 0,
    focusScore: 89,
    distractions: 3,
    status: SESSION_STATUS.COMPLETED,
  },
  {
    id: "demo-session-003",
    date: createSessionDate(1, 8, 30).toISOString(),
    startTime: createSessionDate(1, 8, 30).toISOString(),
    endTime: createSessionDate(1, 9, 42).toISOString(),
    duration: minutesToSeconds(72),
    focusTime: minutesToSeconds(59),
    distractionTime: minutesToSeconds(13),
    phoneTime: minutesToSeconds(5),
    breakTime: 0,
    focusScore: 82,
    distractions: 6,
    status: SESSION_STATUS.COMPLETED,
  },
  {
    id: "demo-session-004",
    date: createSessionDate(2, 16, 10).toISOString(),
    startTime: createSessionDate(2, 16, 10).toISOString(),
    endTime: createSessionDate(2, 17, 5).toISOString(),
    duration: minutesToSeconds(55),
    focusTime: minutesToSeconds(42),
    distractionTime: minutesToSeconds(13),
    phoneTime: minutesToSeconds(6),
    breakTime: 0,
    focusScore: 76,
    distractions: 8,
    status: SESSION_STATUS.COMPLETED,
  },
  {
    id: "demo-session-005",
    date: createSessionDate(3, 10, 0).toISOString(),
    startTime: createSessionDate(3, 10, 0).toISOString(),
    endTime: createSessionDate(3, 11, 24).toISOString(),
    duration: minutesToSeconds(84),
    focusTime: minutesToSeconds(74),
    distractionTime: minutesToSeconds(10),
    phoneTime: minutesToSeconds(2),
    breakTime: 0,
    focusScore: 91,
    distractions: 3,
    status: SESSION_STATUS.COMPLETED,
  },
  {
    id: "demo-session-006",
    date: createSessionDate(4, 13, 30).toISOString(),
    startTime: createSessionDate(4, 13, 30).toISOString(),
    endTime: createSessionDate(4, 14, 17).toISOString(),
    duration: minutesToSeconds(47),
    focusTime: minutesToSeconds(34),
    distractionTime: minutesToSeconds(13),
    phoneTime: minutesToSeconds(7),
    breakTime: 0,
    focusScore: 71,
    distractions: 9,
    status: SESSION_STATUS.COMPLETED,
  },
  {
    id: "demo-session-007",
    date: createSessionDate(5, 9, 45).toISOString(),
    startTime: createSessionDate(5, 9, 45).toISOString(),
    endTime: createSessionDate(5, 10, 55).toISOString(),
    duration: minutesToSeconds(70),
    focusTime: minutesToSeconds(61),
    distractionTime: minutesToSeconds(9),
    phoneTime: minutesToSeconds(3),
    breakTime: 0,
    focusScore: 88,
    distractions: 4,
    status: SESSION_STATUS.COMPLETED,
  },
];

export const getMockSessions = () => {
  return mockSessions.map((session) => ({
    ...session,
  }));
};

export default mockSessions;