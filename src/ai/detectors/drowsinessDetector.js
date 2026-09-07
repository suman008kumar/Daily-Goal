let closedSince = 0;

export const detectDrowsiness = async ({ eyes } = {}) => {
  const ts = Date.now();

  if (!eyes || eyes.status === "unavailable" || eyes.eyesOpen === null) {
    closedSince = 0;
    return {
      type: "DROWSINESS",
      drowsy: null,
      confidence: 0,
      status: "unavailable",
      closedFor: 0,
      timestamp: ts,
    };
  }

  if (eyes.eyesOpen === false) {
    if (!closedSince) closedSince = ts;
  } else {
    closedSince = 0;
  }

  const closedFor = closedSince ? ts - closedSince : 0;
  const drowsy = closedFor >= 2500;

  return {
    type: "DROWSINESS",
    drowsy,
    confidence: drowsy ? 0.92 : 0.9,
    status: drowsy ? "drowsy" : "normal",
    closedFor,
    timestamp: ts,
  };
};

export const resetDrowsiness = () => { closedSince = 0; };
export default detectDrowsiness;
