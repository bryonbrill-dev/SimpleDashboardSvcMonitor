(function initDashboardEnhancements() {
  const filterForm = document.getElementById("dashboard-filters");
  if (filterForm) {
    const controls = filterForm.querySelectorAll("select");
    controls.forEach((control) => {
      control.addEventListener("change", () => {
        filterForm.requestSubmit();
      });
    });
  }

  const config = window.dashboardHeartbeatConfig;
  if (!config || !config.path) return;

  let lastPollAt = config.baselinePollAt || null;
  const checkEveryMs = Number(config.checkEveryMs) > 0 ? Number(config.checkEveryMs) : 15000;

  const checkHeartbeat = async () => {
    try {
      const response = await fetch(config.path, { headers: { "Accept": "application/json" } });
      if (!response.ok) return;
      const payload = await response.json();
      const nextPollAt = payload.lastSuccessfulPollAt || null;

      if (!lastPollAt && nextPollAt) {
        window.location.reload();
        return;
      }

      if (lastPollAt && nextPollAt && Date.parse(nextPollAt) > Date.parse(lastPollAt)) {
        window.location.reload();
        return;
      }

      lastPollAt = nextPollAt;
    } catch (_error) {
      // Best-effort polling; ignore transient network issues.
    }
  };

  window.setInterval(checkHeartbeat, checkEveryMs);
})();
