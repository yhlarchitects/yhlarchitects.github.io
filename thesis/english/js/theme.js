/* 밝기: FORMA 한 방식(html[data-theme]). 저장값 > 기기 설정. 머리에서 먼저 돌아 깜빡임을 막는다. */
(function () {
  var html = document.documentElement;
  var KEY = "forma-theme:" + (html.getAttribute("data-page") || "page");
  function load() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function prefers() { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
  function apply(t) {
    html.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0F0F0F" : "#FFFFFF");
    var bs = document.querySelectorAll(".js-theme");
    for (var i = 0; i < bs.length; i++) { bs[i].textContent = t === "dark" ? "밝게" : "어둡게"; bs[i].setAttribute("aria-pressed", t === "dark"); }
  }
  apply(load() || prefers());
  document.addEventListener("DOMContentLoaded", function () { apply(html.getAttribute("data-theme")); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".js-theme"); if (!b) return;
    var t = html.getAttribute("data-theme") === "dark" ? "light" : "dark"; apply(t); store(t);
  });
})();
