export const mockLiveUsers = [
  {
    id: "demo-user-001",
    name: "Study Session 01",
    status: "focused",
    focusScore: 92,
    sessionDuration: 48 * 60,
    activity: "Studying",
    isDemo: true,
    source: "DEMO",
  },
  {
    id: "demo-user-002",
    name: "Study Session 02",
    status: "focused",
    focusScore: 87,
    sessionDuration: 72 * 60,
    activity: "Studying",
    isDemo: true,
    source: "DEMO",
  },
  {
    id: "demo-user-003",
    name: "Study Session 03",
    status: "away",
    focusScore: 64,
    sessionDuration: 35 * 60,
    activity: "Away from desk",
    isDemo: true,
    source: "DEMO",
  },
  {
    id: "demo-user-004",
    name: "Study Session 04",
    status: "distracted",
    focusScore: 71,
    sessionDuration: 56 * 60,
    activity: "Distracted",
    isDemo: true,
    source: "DEMO",
  },
  {
    id: "demo-user-005",
    name: "Study Session 05",
    status: "focused",
    focusScore: 95,
    sessionDuration: 91 * 60,
    activity: "Studying",
    isDemo: true,
    source: "DEMO",
  },
];

export const getMockLiveUsers = () => {
  return mockLiveUsers.map((user) => ({
    ...user,
  }));
};

export default mockLiveUsers;