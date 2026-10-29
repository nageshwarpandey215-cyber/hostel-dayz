/* ============================================================
   Hostel-Dayz — shared core JS
   DB wrapper (localStorage), seed data, navbar, toast, helpers
   ============================================================ */
"use strict";

/* ---------- localStorage wrapper ---------- */
const DB = {
  _key(name) { return "hd_" + name; },
  get(name, fallback) {
    try {
      const raw = localStorage.getItem(this._key(name));
      if (raw === null) return fallback !== undefined ? fallback : [];
      return JSON.parse(raw);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
    }
  },
  set(name, value) {
    localStorage.setItem(this._key(name), JSON.stringify(value));
  },
  push(name, item) {
    const arr = this.get(name, []);
    arr.push(item);
    this.set(name, arr);
    return item;
  },
  remove(name, predicate) {
    const arr = this.get(name, []).filter((x) => !predicate(x));
    this.set(name, arr);
    return arr;
  }
};

/* ---------- ID + date helpers ---------- */
function makeId(prefix) {
  return prefix + "-" + Math.floor(1000 + Math.random() * 9000);
}
function txnId() {
  const d = new Date();
  const ymd = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  return "TXN-" + ymd + "-" + Math.floor(100000 + Math.random() * 900000);
}
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function daysAgo(n) {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ---------- Toast notifications ---------- */
let _toastTimer = null;
function toast(message, type) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = "show" + (type ? " " + type : "");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ""; }, 3200);
}

/* ---------- Seed demo data on first run ---------- */
function seedIfNeeded() {
  if (localStorage.getItem("hd_seeded") === "1") return;

  DB.set("students", [
    { id: "STU-1001", name: "Aarav Sharma", email: "aarav.sharma@example.com", phone: "9876543210", room: "A-101", course: "B.Tech CSE", year: "2nd Year", createdAt: daysAgo(40) },
    { id: "STU-1002", name: "Diya Verma", email: "diya.verma@example.com", phone: "9812345678", room: "B-204", course: "B.Sc Physics", year: "1st Year", createdAt: daysAgo(32) },
    { id: "STU-1003", name: "Kabir Singh", email: "kabir.singh@example.com", phone: "9765432109", room: "A-112", course: "BBA", year: "3rd Year", createdAt: daysAgo(25) }
  ]);

  DB.set("announcements", [
    { id: "ANN-3001", title: "Diwali vacation — hostel closing dates", message: "The hostel will remain closed from 18 Oct to 24 Oct for Diwali. All residents must vacate their rooms by 6 PM on 17 Oct and collect the vacation pass from the warden's office.", createdAt: daysAgo(1) },
    { id: "ANN-3002", title: "Mess menu change from Monday", message: "Based on student feedback, the mess committee has revised the weekly menu. Paneer will now be served on Wednesdays and Saturdays. The new menu is pinned on the mess notice board.", createdAt: daysAgo(4) },
    { id: "ANN-3003", title: "Wi-Fi maintenance on Sunday", message: "Campus Wi-Fi will be down from 6 AM to 10 AM this Sunday for router maintenance. Please plan your work accordingly.", createdAt: daysAgo(7) }
  ]);

  DB.set("leaves", [
    { id: "LV-4001", name: "Aarav Sharma", room: "A-101", from: "2026-10-12", to: "2026-10-14", reason: "Family function at home in Lucknow.", status: "PENDING", createdAt: daysAgo(1) },
    { id: "LV-4002", name: "Kabir Singh", room: "A-112", from: "2026-10-02", to: "2026-10-03", reason: "Medical checkup at city hospital.", status: "APPROVED", createdAt: daysAgo(9) }
  ]);

  DB.set("complaints", [
    { id: "CMP-5001", name: "Diya Verma", room: "B-204", category: "Water", description: "No hot water supply on the 2nd floor since yesterday morning.", status: "Open", createdAt: daysAgo(1) },
    { id: "CMP-5002", name: "Aarav Sharma", room: "A-101", category: "Electricity", description: "Tube light in room A-101 is flickering continuously.", status: "In Progress", createdAt: daysAgo(3) },
    { id: "CMP-5003", name: "Kabir Singh", room: "A-112", category: "Mess", description: "Dinner quality was poor on Friday — rice was undercooked.", status: "Resolved", createdAt: daysAgo(8) }
  ]);

  DB.set("payments", [
    { id: txnId(), name: "Aarav Sharma", room: "A-101", feeType: "Hostel Fee", amount: 24000, method: "Card", createdAt: daysAgo(12), status: "SUCCESS" }
  ]);

  localStorage.setItem("hd_seeded", "1");
}

/* ---------- Navbar: active link + mobile toggle ---------- */
function initNavbar() {
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === file) a.classList.add("active");
    else a.classList.remove("active");
    a.removeAttribute("aria-current");
    if (href === file) a.setAttribute("aria-current", "page");
  });

  const toggle = document.querySelector(".nav-toggle");
  const links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  seedIfNeeded();
  initNavbar();
});
