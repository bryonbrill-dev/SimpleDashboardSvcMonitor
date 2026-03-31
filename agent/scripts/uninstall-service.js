/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

try {
  const { Service } = require("node-windows");
  const svc = new Service({
    name: "Windows Service Monitor Agent",
    script: path.join(__dirname, "..", "dist", "index.js")
  });

  svc.on("uninstall", () => {
    console.log("Agent service uninstalled");
  });

  svc.uninstall();
} catch (error) {
  console.error("node-windows is required on Windows hosts.", error.message);
  process.exit(1);
}
