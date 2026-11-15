/* Opt in with <span data-row-date="YYYY-MM-DD" hidden></span> in a table row. */
(function () {
  "use strict";
  var dayMs = 86400000;
  var refreshTimer;

  function calendarDay(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    var parts = value.split("-").map(Number);
    var date = new Date(0);
    date.setUTCFullYear(parts[0], parts[1] - 1, parts[2]);
    date.setUTCHours(0, 0, 0, 0);
    if (
      date.getUTCFullYear() !== parts[0] ||
      date.getUTCMonth() !== parts[1] - 1 ||
      date.getUTCDate() !== parts[2]
    )
      return null;
    return date.getTime() / dayMs;
  }

  function refresh() {
    var now = new Date();
    // Compare local calendar dates using UTC day numbers to avoid DST fractions.
    var today = calendarDay(
      String(now.getFullYear()).padStart(4, "0") +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0"),
    );
    document.querySelectorAll("tr[data-date-state]").forEach(function (row) {
      row.removeAttribute("data-date-state");
    });
    document
      .querySelectorAll("table [data-row-date]")
      .forEach(function (marker) {
        var row = marker.closest("tr");
        var cell = marker.closest("td");
        var table = marker.closest("table");
        var date = calendarDay(marker.getAttribute("data-row-date"));
        // Keep sorting chronological even when the visible date is written out
        // or embedded in an assessment-based grace-period explanation.
        if (cell && date !== null)
          cell.setAttribute("data-sort", marker.getAttribute("data-row-date"));
        if (table && row) {
          var sorted = table.querySelector("thead th[aria-sort]");
          var fallback = table.querySelector("thead [data-date-default]");
          var selected =
            sorted && sorted.querySelector("[data-date-column]")
              ? sorted
              : fallback && fallback.closest("th");
          if (selected && cell !== row.cells[selected.cellIndex]) return;
        }
        if (!row || date === null || row.hasAttribute("data-date-state"))
          return;
        var days = date - today;
        var state =
          days < -60
            ? "past"
            : days < 0
              ? "recent"
              : days <= 60
                ? "upcoming"
                : "future";
        row.setAttribute("data-date-state", state);
      });
    clearTimeout(refreshTimer);
    var midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    refreshTimer = setTimeout(
      refresh,
      midnight.getTime() - now.getTime() + 1000,
    );
  }

  // Zensical instant navigation replaces the page without reloading scripts.
  if (typeof document$ !== "undefined") {
    document$.subscribe(refresh);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh, { once: true });
  } else {
    refresh();
  }
  // Tablesort emits a non-bubbling event; capture catches it at the document.
  document.addEventListener("afterSort", refresh, true);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) refresh();
  });
})();
