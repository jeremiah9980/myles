// Theme toggle + current-page nav highlight. No dependencies.
(function () {
  var root = document.documentElement;
  var KEY = "mwp-theme";
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  } catch (e) {}

  function current() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paint(btn) { btn.textContent = current() === "dark" ? "☀" : "☾"; btn.setAttribute("aria-label", "Switch to " + (current() === "dark" ? "light" : "dark") + " theme"); }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector(".theme-toggle");
    if (btn) {
      paint(btn);
      btn.addEventListener("click", function () {
        var next = current() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        paint(btn);
      });
    }
    var here = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("nav.main a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === here || (here === "" && href === "index.html")) a.setAttribute("aria-current", "page");
    });
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  });
})();
