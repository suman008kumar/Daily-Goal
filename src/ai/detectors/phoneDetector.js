export const detectPhone = async (_video, objectResult = null) => {
  const result = objectResult || {};
  const phones = Array.isArray(result.objects)
    ? result.objects.filter((item) => ["cell phone", "mobile phone", "phone"].includes(String(item?.label || "").toLowerCase()))
    : [];
  const detected = phones.length > 0;
  const confidence = phones.length
    ? Math.max(...phones.map((item) => Number(item?.confidence) || 0))
    : 0;
  return {
    type: "PHONE",
    detected,
    phoneDetected: detected,
    confidence,
    status: result.status === "unavailable" ? "unavailable" : detected ? "detected" : "not_detected",
    timestamp: result.timestamp || Date.now(),
  };
};
export default detectPhone;
