/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

try {
  const { Service } = require("node-windows");
  const svc = new Service({
    name: "Windows Service Monitor Dashboard",
    script: path.join(__dirname, "..", "dist", "index.js")
  });

  svc.on("uninstall", () => {
    console.log("Dashboard service uninstalled");
  });

  svc.uninstall();
} catch (error) {
  console.error("node-windows is required on Windows hosts.", error.message);
  process.exit(1);
}
