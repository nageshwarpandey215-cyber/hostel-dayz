/* Hostel-Dayz — leave application + warden approval logic */
"use strict";

function statusBadge(status) {
  var cls = status === "APPROVED" ? "b-approved" : status === "REJECTED" ? "b-rejected" : "b-pending";
  return '<span class="badge ' + cls + '">' + status + "</span>";
}

function leaveCard(l, warden) {
  var html = '<article class="record">' +
    '<div class="meta">' + esc(l.id) + " &middot; applied " + fmtDateTime(l.createdAt) + "</div>" +
    "<h3>" + esc(l.name) + " <span class='muted'>(" + esc(l.room) + ")</span></h3>" +
    "<p><strong>" + fmtDate(l.from) + "</strong> &rarr; <strong>" + fmtDate(l.to) + "</strong> &nbsp;" + statusBadge(l.status) + "</p>" +
    "<p>" + esc(l.reason) + "</p>";
  if (warden) {
    html += '<div class="actions">';
    if (l.status === "PENDING") {
      html += '<button class="btn btn-success btn-sm" data-approve="' + esc(l.id) + '">Approve</button>' +
              '<button class="btn btn-danger btn-sm" data-reject="' + esc(l.id) + '">Reject</button>';
    } else {
      html += "<span class='muted'>Decision recorded.</span>";
    }
    html += '<button class="btn btn-ghost btn-sm" data-delleave="' + esc(l.id) + '">Delete</button></div>';
  }
  return html + "</article>";
}

function renderMyLeaves() {
  var leaves = DB.get("leaves", []).slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 5);
  var box = document.getElementById("myLeaves");
  box.innerHTML = leaves.length
    ? leaves.map(function (l) { return leaveCard(l, false); }).join("")
    : '<div class="empty">No leave applications yet. Submit your first one above.</div>';
}

var leaveFilter = "ALL";
function renderAllLeaves() {
  var leaves = DB.get("leaves", []).slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
  if (leaveFilter !== "ALL") leaves = leaves.filter(function (l) { return l.status === leaveFilter; });
  var box = document.getElementById("allLeaves");
  box.innerHTML = leaves.length
    ? leaves.map(function (l) { return leaveCard(l, true); }).join("")
    : '<div class="empty">No leave requests match this filter.</div>';
}

function setTab(which) {
  var apply = which === "apply";
  document.getElementById("viewApply").hidden = !apply;
  document.getElementById("viewWarden").hidden = apply;
  document.getElementById("tabApply").classList.toggle("active", apply);
  document.getElementById("tabWarden").classList.toggle("active", !apply);
  document.getElementById("tabApply").setAttribute("aria-selected", apply);
  document.getElementById("tabWarden").setAttribute("aria-selected", !apply);
}

function lerr(id, msg) { document.getElementById(id).textContent = msg || ""; }

document.addEventListener("DOMContentLoaded", function () {
  renderMyLeaves();
  renderAllLeaves();

  document.getElementById("tabApply").addEventListener("click", function () { setTab("apply"); });
  document.getElementById("tabWarden").addEventListener("click", function () { setTab("warden"); });

  document.querySelectorAll("[data-lfilter]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-lfilter]").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      leaveFilter = btn.getAttribute("data-lfilter");
      renderAllLeaves();
    });
  });

  var today = new Date().toISOString().slice(0, 10);
  document.getElementById("lFrom").min = today;
  document.getElementById("lTo").min = today;

  document.getElementById("leaveForm").addEventListener("submit", function (e) {
    e.preventDefault();
    ["eLName", "eLRoom", "eLFrom", "eLTo", "eLReason"].forEach(function (id) { lerr(id); });
    var name = document.getElementById("lName").value;
    var room = document.getElementById("lRoom").value.toUpperCase();
    var from = document.getElementById("lFrom").value;
    var to = document.getElementById("lTo").value;
    var reason = document.getElementById("lReason").value;
    var ok = true;

    if (name.trim().length < 3) { lerr("eLName", "Enter your full name."); ok = false; }
    if (!/^[A-Za-z]-\d{1,3}$/.test(room.trim())) { lerr("eLRoom", "Room format like A-101."); ok = false; }
    if (!from) { lerr("eLFrom", "Pick a start date."); ok = false; }
    else if (from < today) { lerr("eLFrom", "Start date cannot be in the past."); ok = false; }
    if (!to) { lerr("eLTo", "Pick an end date."); ok = false; }
    else if (from && to < from) { lerr("eLTo", "End date cannot be before the start date."); ok = false; }
    if (reason.trim().length < 10) { lerr("eLReason", "Please give a reason (min 10 characters)."); ok = false; }

    if (!ok) { toast("Please fix the highlighted fields.", "error"); return; }

    DB.push("leaves", {
      id: makeId("LV"), name: name.trim(), room: room.trim(),
      from: from, to: to, reason: reason.trim(),
      status: "PENDING", createdAt: Date.now()
    });
    e.target.reset();
    renderMyLeaves(); renderAllLeaves();
    toast("Leave application submitted. Status: PENDING.", "success");
  });

  document.getElementById("viewWarden").addEventListener("click", function (e) {
    var approve = e.target.getAttribute("data-approve");
    var reject = e.target.getAttribute("data-reject");
    var del = e.target.getAttribute("data-delleave");
    if (approve || reject) {
      var leaves = DB.get("leaves", []);
      var rec = leaves.find(function (l) { return l.id === (approve || reject); });
      if (rec) {
        rec.status = approve ? "APPROVED" : "REJECTED";
        DB.set("leaves", leaves);
        renderAllLeaves(); renderMyLeaves();
        toast("Leave " + (approve ? "approved" : "rejected") + ".", "success");
      }
    } else if (del) {
      if (!confirm("Delete this leave request?")) return;
      DB.remove("leaves", function (l) { return l.id === del; });
      renderAllLeaves(); renderMyLeaves();
      toast("Leave request deleted.", "success");
    }
  });
});
