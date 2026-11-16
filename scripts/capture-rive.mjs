// Capture this project's own, script-free local preview bundle.
// Start the Rive CLI for animation-src/wood-feedback on loopback port 8179 first.
import { writeFileSync } from "node:fs";
const ws = new WebSocket("ws://127.0.0.1:8179");
ws.binaryType = "arraybuffer";
const timer = setTimeout(() => {
  console.error(
    "No local Rive build received. Start the project with --serve=8179 first.",
  );
  ws.close();
  process.exitCode = 1;
}, 8000);
ws.onmessage = ({ data }) => {
  if (!(data instanceof ArrayBuffer)) return;
  const frame = Buffer.from(data);
  if (
    frame.subarray(0, 4).toString() !== "RVLK" ||
    frame.readUInt16LE(6) !== 5 ||
    frame.subarray(16, 20).toString() !== "RIVE"
  )
    return;
  const asset = frame.subarray(16);
  writeFileSync("public/assets/rive/wood-feedback.riv", asset);
  console.log(`Saved local Rive build: ${asset.length} bytes`);
  clearTimeout(timer);
  ws.close();
};
ws.onerror = () => {
  clearTimeout(timer);
  console.error("Local Rive preview server is unavailable.");
  process.exitCode = 1;
};
