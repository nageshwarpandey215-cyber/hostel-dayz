/* Hostel-Dayz — complaint tracking logic (Open -> In Progress -> Resolved) */
"use strict";

var cmpFilter = "ALL";

function cmpBadge(status) {
  var cls = status === "Resolved" ? "b-resolved" : status === "In Progress" ? "b-progress" : "b-open";
  return '<span class="badge ' + cls + '">' + esc(status) + "</span>";
}

function renderComplaints() {
  var list = DB.get("complaints", []).slice()
    .sort(function (a, b) { return b.createdAt - a.createdAt; });
  var shown = cmpFilter === "ALL" ? list : list.filter(function (c) { return c.status === cmpFilter; });
  var box = document.getElementById("cmpList");
  document.getElementById("cmpCount").textContent = list.length;

  box.innerHTML = shown.length
    ? shown.map(function (c) {
        var actions = '<div class="actions">';
        if (c.status === "Open") {
          actions += '<button class="btn btn-warn btn-sm" data-advance="' + esc(c.id) + '">Mark In Progress</button>';
        }
        if (c.status !== "Resolved") {
          actions += '<button class="btn btn-success btn-sm" data-resolve="' + esc(c.id) + '">Resolve</button>';
        }
        actions += '<button class="btn btn-ghost btn-sm" data-delcmp="' + esc(c.id) + '">Delete</button></div>';

        return '<article class="record">' +
          '<div class="meta">' + esc(c.id) + " &middot; " + fmtDateTime(c.createdAt) + "</div>" +
          "<h3>" + esc(c.category) + " complaint " + cmpBadge(c.status) + "</h3>" +
          "<p><strong>" + esc(c.name) + "</strong> <span class='muted'>(" + esc(c.room) + ")</span></p>" +
          "<p>" + esc(c.description) + "</p>" + actions + "</article>";
      }).join("")
    : '<div class="empty">No complaints match this filter.</div>';
}

function cerr(id, msg) { document.getElementById(id).textContent = msg || ""; }

document.addEventListener("DOMContentLoaded", function () {
  renderComplaints();

  document.querySelectorAll("[data-cfilter]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-cfilter]").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      cmpFilter = btn.getAttribute("data-cfilter");
      renderComplaints();
    });
  });

  document.getElementById("cmpForm").addEventListener("submit", function (e) {
    e.preventDefault();
    ["eCName", "eCRoom", "eCCat", "eCDesc"].forEach(function (id) { cerr(id); });
    var name = document.getElementById("cName").value;
    var room = document.getElementById("cRoom").value.toUpperCase();
    var cat = document.getElementById("cCat").value;
    var desc = document.getElementById("cDesc").value;
    var ok = true;

    if (name.trim().length < 3) { cerr("eCName", "Enter your full name."); ok = false; }
    if (!/^[A-Za-z]-\d{1,3}$/.test(room.trim())) { cerr("eCRoom", "Room format like B-204."); ok = false; }
    if (!cat) { cerr("eCCat", "Select a category."); ok = false; }
    if (desc.trim().length < 10) { cerr("eCDesc", "Describe the issue (min 10 characters)."); ok = false; }

    if (!ok) { toast("Please fix the highlighted fields.", "error"); return; }

    var rec = DB.push("complaints", {
      id: makeId("CMP"), name: name.trim(), room: room.trim(),
      category: cat, description: desc.trim(),
      status: "Open", createdAt: Date.now()
    });
    e.target.reset();
    renderComplaints();
    toast("Complaint raised. Tracking ID: " + rec.id, "success");
  });

  document.getElementById("cmpList").addEventListener("click", function (e) {
    var adv = e.target.getAttribute("data-advance");
    var res = e.target.getAttribute("data-resolve");
    var del = e.target.getAttribute("data-delcmp");
    if (!adv && !res && !del) return;

    if (del) {
      if (!confirm("Delete this complaint?")) return;
      DB.remove("complaints", function (c) { return c.id === del; });
      renderComplaints();
      toast("Complaint deleted.", "success");
      return;
    }

    var list = DB.get("complaints", []);
    var rec = list.find(function (c) { return c.id === (adv || res); });
    if (rec) {
      rec.status = adv ? "In Progress" : "Resolved";
      DB.set("complaints", list);
      renderComplaints();
      toast(rec.id + " is now " + rec.status + ".", "success");
    }
  });
});
