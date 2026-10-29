/* Hostel-Dayz — announcements board logic */
"use strict";

function renderAnnouncements() {
  var list = DB.get("announcements", []).slice()
    .sort(function (a, b) { return b.createdAt - a.createdAt; });
  var box = document.getElementById("annList");
  document.getElementById("annCount").textContent = list.length;
  box.innerHTML = list.length
    ? list.map(function (a) {
        return '<article class="record">' +
          '<div class="meta">' + esc(a.id) + " &middot; " + fmtDateTime(a.createdAt) + "</div>" +
          "<h3>" + esc(a.title) + "</h3>" +
          "<p>" + esc(a.message).replace(/\n/g, "<br>") + "</p>" +
          '<div class="actions"><button class="btn btn-danger btn-sm" data-delann="' + esc(a.id) + '">Delete</button></div>' +
          "</article>";
      }).join("")
    : '<div class="empty">No announcements yet. Post the first one using the form.</div>';
}

document.addEventListener("DOMContentLoaded", function () {
  renderAnnouncements();

  document.getElementById("annForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var title = document.getElementById("aTitle").value;
    var msg = document.getElementById("aMsg").value;
    document.getElementById("eATitle").textContent = "";
    document.getElementById("eAMsg").textContent = "";
    var ok = true;
    if (title.trim().length < 5) { document.getElementById("eATitle").textContent = "Give a clear title (min 5 characters)."; ok = false; }
    if (msg.trim().length < 10) { document.getElementById("eAMsg").textContent = "Write the announcement (min 10 characters)."; ok = false; }
    if (!ok) { toast("Please fix the highlighted fields.", "error"); return; }

    DB.push("announcements", {
      id: makeId("ANN"), title: title.trim(), message: msg.trim(), createdAt: Date.now()
    });
    e.target.reset();
    renderAnnouncements();
    toast("Announcement published.", "success");
  });

  document.getElementById("annList").addEventListener("click", function (e) {
    var id = e.target.getAttribute("data-delann");
    if (!id) return;
    if (!confirm("Delete this announcement?")) return;
    DB.remove("announcements", function (a) { return a.id === id; });
    renderAnnouncements();
    toast("Announcement deleted.", "success");
  });
});
