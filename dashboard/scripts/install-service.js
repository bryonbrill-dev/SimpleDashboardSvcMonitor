/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

try {
  const { Service } = require("node-windows");
  const svc = new Service({
    name: "Windows Service Monitor Dashboard",
    description: "Central dashboard for Windows Service Monitor",
    script: path.join(__dirname, "..", "dist", "index.js")
  });

  svc.on("install", () => {
    console.log("Dashboard service installed");
    svc.start();
  });

  svc.install();
} catch (error) {
  console.error("node-windows is required on Windows hosts.", error.message);
  process.exit(1);
}
