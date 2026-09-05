let closedSince=0;
export const detectDrowsiness=async({eyes}={})=>{const ts=Date.now();if(eyes?.eyesOpen===false){if(!closedSince)closedSince=ts;}else closedSince=0;const closedFor=closedSince?ts-closedSince:0;const drowsy=closedFor>=2500;return{type:"DROWSINESS",drowsy,confidence:drowsy?.92:.9,status:drowsy?"drowsy":"normal",closedFor,timestamp:ts};};
export const resetDrowsiness=()=>{closedSince=0};
export default detectDrowsiness;
