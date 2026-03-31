/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

try {
  const { Service } = require("node-windows");
  const svc = new Service({
    name: "Windows Service Monitor Agent",
    description: "Agent API for querying local Windows service states",
    script: path.join(__dirname, "..", "dist", "index.js")
  });

  svc.on("install", () => {
    console.log("Agent service installed");
    svc.start();
  });

  svc.install();
} catch (error) {
  console.error("node-windows is required on Windows hosts.", error.message);
  process.exit(1);
}
