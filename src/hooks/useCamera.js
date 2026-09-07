import { useCallback, useEffect, useRef, useState } from "react";

const CAMERA_STORAGE_KEY = "daily_goal_camera_preferences";

const getStoredPreference = () => {
  try {
    const saved = localStorage.getItem(CAMERA_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const getCameraError = (error) => {
  if (!error) {
    return "Unable to access the camera.";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission was denied. Please allow camera access from your browser.";

    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found on this device.";

    case "NotReadableError":
    case "TrackStartError":
      return "The camera is already being used by another application.";

    case "OverconstrainedError":
      return "The selected camera settings are not supported by this device.";

    case "SecurityError":
      return "Camera access is blocked by the browser security settings.";

    default:
      return "Something went wrong while accessing the camera.";
  }
};

export const useCamera = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("not_asked");
  const [error, setError] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraState, setCameraState] = useState("IDLE");
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const preference = getStoredPreference();

  const savePreference = useCallback((deviceId) => {
    try {
      localStorage.setItem(
        CAMERA_STORAGE_KEY,
        JSON.stringify({
          selectedDeviceId: deviceId,
        })
      );
    } catch {
      // Continue working without localStorage.
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
    setCameraState("STOPPED");
  }, []);

  const loadDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      const allDevices =
        await navigator.mediaDevices.enumerateDevices();

      const cameraDevices = allDevices.filter(
        (device) => device.kind === "videoinput"
      );

      setDevices(cameraDevices);

      return cameraDevices;
    } catch {
      return [];
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId = selectedDeviceId || preference.selectedDeviceId) => {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        setError(
          "Camera access is not supported by this browser."
        );
        return null;
      }

      stopCamera();
      setStatus("requesting");
      setCameraState("STARTING");

      try {
        const constraints = {
          audio: false,
          video: deviceId
            ? {
                deviceId: {
                  exact: deviceId,
                },
              }
            : {
                facingMode: "user",
                width: {
                  ideal: 1280,
                },
                height: {
                  ideal: 720,
                },
              },
        };

        const stream =
          await navigator.mediaDevices.getUserMedia(
            constraints
          );

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.muted = true;
          videoRef.current.playsInline = true;

          try {
            await videoRef.current.play();
          } catch {
            // Browser may require a user gesture.
          }
        }

        const activeTrack =
          stream.getVideoTracks()[0];

        const activeDeviceId =
          activeTrack?.getSettings?.().deviceId || deviceId || "";

        if (activeDeviceId) {
          setSelectedDeviceId(activeDeviceId);
          savePreference(activeDeviceId);
        }

        setStatus("granted");
        setIsCameraOn(true);
        setCameraState("LIVE");

        await loadDevices();

        return stream;
      } catch (cameraError) {
        const message =
          getCameraError(cameraError);

        setStatus(
          cameraError?.name === "NotAllowedError"
            ? "denied"
            : "error"
        );
        setCameraState("ERROR");

        setError(message);

        stopCamera();

        return null;
      }
    },
    [
      selectedDeviceId,
      preference.selectedDeviceId,
      stopCamera,
      loadDevices,
      savePreference,
    ]
  );

  const switchCamera = useCallback(
    async (deviceId) => {
      if (!deviceId) {
        return;
      }

      setSelectedDeviceId(deviceId);
      savePreference(deviceId);

      if (isCameraOn) {
        await startCamera(deviceId);
      }
    },
    [
      isCameraOn,
      startCamera,
      savePreference,
    ]
  );

  useEffect(() => {
    loadDevices();

    const handleDeviceChange = () => {
      loadDevices();
    };

    navigator.mediaDevices?.addEventListener?.(
      "devicechange",
      handleDeviceChange
    );

    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        handleDeviceChange
      );

      stopCamera();
    };
  }, [loadDevices, stopCamera]);

  return {
    videoRef,
    stream: streamRef.current,

    status,
    error,
    permissionState: status.toUpperCase(),
    cameraState,

    isCameraOn,

    devices,
    cameras: devices,
    selectedDeviceId,
    selectedCameraId: selectedDeviceId,
    videoStream: streamRef.current,

    startCamera,
    stopCamera,
    switchCamera,
    selectCamera: switchCamera,
    loadDevices,
  };
};

export default useCamera;