import { detectPose } from "../models/poseModel";
export const detectPosture=async(video)=>{const r=await detectPose(video);return{type:"POSTURE",detected:r.detected,confidence:r.confidence,posture:r.posture,headPosition:r.headPosition,status:r.status==="unavailable"?"unavailable":r.posture==="good"?"good":r.posture==="unknown"?"unknown":"needs_attention",timestamp:r.timestamp};};
export default detectPosture;
