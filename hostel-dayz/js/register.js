/* Hostel-Dayz — student registration logic */
"use strict";

function fieldError(id, msg) {
  document.getElementById(id).textContent = msg || "";
}

function validateRegistration(d) {
  var ok = true;
  fieldError("eName"); fieldError("eEmail"); fieldError("ePhone");
  fieldError("eRoom"); fieldError("eCourse"); fieldError("eYear");

  if (d.name.trim().length < 3) { fieldError("eName", "Enter the student's full name."); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) { fieldError("eEmail", "Enter a valid email address."); ok = false; }
  if (!/^[6-9]\d{9}$/.test(d.phone.trim())) { fieldError("ePhone", "Enter a valid 10-digit Indian mobile number."); ok = false; }
  if (!/^[A-Za-z]-\d{1,3}$/.test(d.room.trim())) { fieldError("eRoom", "Room format like A-101."); ok = false; }
  if (!d.course) { fieldError("eCourse", "Select a course."); ok = false; }
  if (!d.year) { fieldError("eYear", "Select the year."); ok = false; }
  return ok;
}

function renderStudents() {
  var students = DB.get("students", []);
  var body = document.getElementById("stuBody");
  document.getElementById("stuCount").textContent = students.length;
  document.getElementById("stuEmpty").hidden = students.length > 0;

  body.innerHTML = students.map(function (s) {
    return "<tr>" +
      "<td data-label='Name'><strong>" + esc(s.name) + "</strong><br><span class='muted'>" + esc(s.id) + "</span></td>" +
      "<td data-label='Room'>" + esc(s.room) + "</td>" +
      "<td data-label='Course'>" + esc(s.course) + "<br><span class='muted'>" + esc(s.year) + "</span></td>" +
      "<td data-label='Contact'>" + esc(s.email) + "<br><span class='muted'>+91 " + esc(s.phone) + "</span></td>" +
      "<td class='actions' data-label='Actions'><button class='btn btn-danger btn-sm' data-del='" + esc(s.id) + "'>Delete</button></td>" +
      "</tr>";
  }).join("");
}

document.addEventListener("DOMContentLoaded", function () {
  renderStudents();

  document.getElementById("regForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      name: document.getElementById("rName").value,
      email: document.getElementById("rEmail").value,
      phone: document.getElementById("rPhone").value,
      room: document.getElementById("rRoom").value.toUpperCase(),
      course: document.getElementById("rCourse").value,
      year: document.getElementById("rYear").value
    };
    if (!validateRegistration(data)) {
      toast("Please fix the highlighted fields.", "error");
      return;
    }
    var students = DB.get("students", []);
    if (students.some(function (s) { return s.email.toLowerCase() === data.email.trim().toLowerCase(); })) {
      fieldError("eEmail", "This email is already registered.");
      toast("This email is already registered.", "error");
      return;
    }
    DB.push("students", {
      id: makeId("STU"),
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      room: data.room.trim(),
      course: data.course,
      year: data.year,
      createdAt: Date.now()
    });
    e.target.reset();
    renderStudents();
    toast("Student registered successfully.", "success");
  });

  document.getElementById("stuBody").addEventListener("click", function (e) {
    var id = e.target.getAttribute("data-del");
    if (!id) return;
    if (!confirm("Remove this student from the register?")) return;
    DB.remove("students", function (s) { return s.id === id; });
    renderStudents();
    toast("Student removed.", "success");
  });
});
