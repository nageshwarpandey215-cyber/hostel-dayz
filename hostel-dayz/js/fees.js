/* ============================================================
   Hostel-Dayz — fee payment logic + PaymentGateway integration
   ============================================================ */
"use strict";

var FEE_AMOUNTS = { "Hostel Fee": 24000, "Mess Fee": 18000 };

function inr(n) {
  return "\u20B9" + Number(n).toLocaleString("en-IN");
}

/* ============================================================
   PaymentGateway — single integration point for payments.

   CURRENT MODE: "demo" — no real gateway, the payment is
   simulated locally (2s processing) and recorded in localStorage.

   HOW TO GO LIVE WITH RAZORPAY (test keys):
   1. In fees.html <head>, add:
        <script src="https://checkout.razorpay.com/v1/checkout.js"><\/script>
   2. Set:  PaymentGateway.provider = "razorpay";
            PaymentGateway.razorpayKeyId = "rzp_test_YOUR_TEST_KEY";
   3. Implement a tiny backend endpoint (e.g. POST /api/create-order)
      that creates a Razorpay order with your key SECRET and returns
      { orderId, amount }. Replace createOrder() below with:
        const res = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInPaise })
        });
        return await res.json();
   4. In processPayment(), open Razorpay checkout with the returned
      orderId instead of the simulated delay:
        new Razorpay({ key: this.razorpayKeyId, order_id: order.orderId,
                       handler: (r) => resolve({ txnId: r.razorpay_payment_id }) }).open();
   The rest of the app (form, receipt, history) keeps working unchanged.

   HOW TO GO LIVE WITH STRIPE: same idea — set provider = "stripe",
   load https://js.stripe.com/v3/, use stripe.confirmCardPayment()
   inside processPayment() with a PaymentIntent from your backend.
   ============================================================ */
var PaymentGateway = {
  provider: "demo",          // "demo" | "razorpay" | "stripe"
  razorpayKeyId: null,       // <-- paste your Razorpay TEST key id here
  stripePublishableKey: null, // <-- paste your Stripe TEST publishable key here

  /* Create an order for `amount` (in rupees). Returns { orderId, amount }. */
  createOrder: function (amount) {
    if (this.provider === "razorpay" || this.provider === "stripe") {
      throw new Error("Live mode: implement createOrder() against your backend (see comments above).");
    }
    return {
      orderId: "ORDER-" + Date.now().toString(36).toUpperCase(),
      amount: amount
    };
  },

  /* Process payment for an order. Resolves { txnId, method } on success. */
  processPayment: function (order, method, details) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (self.provider === "razorpay" || self.provider === "stripe") {
        reject(new Error("Live mode: implement processPayment() with the provider SDK (see comments above)."));
        return;
      }
      // DEMO MODE: simulate gateway processing delay, then succeed.
      setTimeout(function () {
        resolve({ txnId: txnId(), method: method });
      }, 2000);
    });
  }
};

/* ---------- card / UPI validation ---------- */
function luhnValid(num) {
  var digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  var sum = 0, dbl = false;
  for (var i = digits.length - 1; i >= 0; i--) {
    var d = parseInt(digits[i], 10);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
}
function expiryValid(v) {
  var m = /^(\d{2})\/(\d{2})$/.exec(v.trim());
  if (!m) return false;
  var mm = parseInt(m[1], 10), yy = 2000 + parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return false;
  var now = new Date();
  var end = new Date(yy, mm, 0, 23, 59, 59); // last moment of expiry month
  return end >= now;
}
function perr(id, msg) { document.getElementById(id).textContent = msg || ""; }

/* ---------- modal helpers ---------- */
var currentOrder = null;
var payMethod = "Card";

function openModal() {
  document.getElementById("payStepForm").hidden = false;
  document.getElementById("payStepReceipt").hidden = true;
  document.getElementById("payModal").classList.add("open");
  document.getElementById("modalClose").focus();
}
function closeModal() {
  document.getElementById("payModal").classList.remove("open");
}

function renderHistory() {
  var list = DB.get("payments", []).slice()
    .sort(function (a, b) { return b.createdAt - a.createdAt; });
  var body = document.getElementById("payBody");
  document.getElementById("payCount").textContent = list.length;
  document.getElementById("payEmpty").hidden = list.length > 0;
  body.innerHTML = list.map(function (p) {
    return "<tr>" +
      "<td data-label='Transaction'><strong>" + esc(p.id) + "</strong><br><span class='muted'>" + fmtDateTime(p.createdAt) + "</span><br>" + '<span class="badge b-success">SUCCESS</span>' + "</td>" +
      "<td data-label='Student'>" + esc(p.name) + "<br><span class='muted'>" + esc(p.room) + "</span></td>" +
      "<td data-label='Fee'>" + esc(p.feeType) + "<br><strong>" + inr(p.amount) + "</strong></td>" +
      "<td data-label='Method'>" + esc(p.method) + "</td>" +
      "</tr>";
  }).join("");
}

function currentAmount() {
  var type = document.getElementById("pType").value;
  if (type === "Other") {
    var v = parseInt(document.getElementById("pCustom").value, 10);
    return isNaN(v) ? 0 : v;
  }
  return FEE_AMOUNTS[type];
}
function refreshSummary() {
  var type = document.getElementById("pType").value;
  document.getElementById("sumType").textContent = type;
  document.getElementById("sumAmount").textContent = inr(currentAmount());
  document.getElementById("customAmtWrap").hidden = type !== "Other";
}

document.addEventListener("DOMContentLoaded", function () {
  renderHistory();
  refreshSummary();
  document.getElementById("pType").addEventListener("change", refreshSummary);
  document.getElementById("pCustom").addEventListener("input", refreshSummary);

  /* payment method tabs */
  function setMethod(m) {
    payMethod = m;
    var card = m === "Card";
    document.getElementById("tabCard").classList.toggle("active", card);
    document.getElementById("tabUpi").classList.toggle("active", !card);
    document.getElementById("tabCard").setAttribute("aria-selected", card);
    document.getElementById("tabUpi").setAttribute("aria-selected", !card);
    document.getElementById("cardPane").hidden = !card;
    document.getElementById("upiPane").hidden = card;
  }
  document.getElementById("tabCard").addEventListener("click", function () { setMethod("Card"); });
  document.getElementById("tabUpi").addEventListener("click", function () { setMethod("UPI"); });

  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("payModal").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });
  document.getElementById("receiptDone").addEventListener("click", closeModal);

  /* open checkout */
  document.getElementById("payForm").addEventListener("submit", function (e) {
    e.preventDefault();
    ["ePName", "ePRoom", "ePCustom"].forEach(function (id) { perr(id); });
    var name = document.getElementById("pName").value;
    var room = document.getElementById("pRoom").value.toUpperCase();
    var type = document.getElementById("pType").value;
    var amount = currentAmount();
    var ok = true;

    if (name.trim().length < 3) { perr("ePName", "Enter your full name."); ok = false; }
    if (!/^[A-Za-z]-\d{1,3}$/.test(room.trim())) { perr("ePRoom", "Room format like A-101."); ok = false; }
    if (type === "Other" && (!(amount > 0) || amount > 1000000)) { perr("ePCustom", "Enter an amount between \u20B91 and \u20B910,00,000."); ok = false; }
    if (!ok) { toast("Please fix the highlighted fields.", "error"); return; }

    currentOrder = {
      order: PaymentGateway.createOrder(amount),
      name: name.trim(), room: room.trim(), feeType: type, amount: amount
    };
    document.getElementById("mType").textContent = type;
    document.getElementById("mStudent").textContent = currentOrder.name + " (" + currentOrder.room + ")";
    document.getElementById("mAmount").textContent = inr(amount);
    document.getElementById("payNowAmt").textContent = inr(amount);
    setMethod("Card");
    openModal();
  });

  /* process payment */
  document.getElementById("payNowBtn").addEventListener("click", function () {
    if (!currentOrder) return;
    var btn = this;
    var valid = true;

    if (payMethod === "Card") {
      ["eCcNum", "eCcName", "eCcExp", "eCcCvv"].forEach(function (id) { perr(id); });
      var num = document.getElementById("ccNum").value;
      var cname = document.getElementById("ccName").value;
      var exp = document.getElementById("ccExp").value;
      var cvv = document.getElementById("ccCvv").value;
      if (!luhnValid(num)) { perr("eCcNum", "Enter a valid card number."); valid = false; }
      if (cname.trim().length < 3) { perr("eCcName", "Enter the name on card."); valid = false; }
      if (!expiryValid(exp)) { perr("eCcExp", "Use MM/YY, not in the past."); valid = false; }
      if (!/^\d{3,4}$/.test(cvv.trim())) { perr("eCcCvv", "3–4 digit CVV."); valid = false; }
      // auto-format card number + expiry while typing
      if (!valid) { toast("Card details look incorrect.", "error"); return; }
    } else {
      perr("eUpiId");
      var upi = document.getElementById("upiId").value.trim();
      if (!/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(upi)) { perr("eUpiId", "Enter a valid UPI ID (name@bank)."); valid = false; }
      if (!valid) { toast("UPI ID looks incorrect.", "error"); return; }
    }

    btn.disabled = true;
    var original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>Processing...';

    PaymentGateway.processPayment(currentOrder.order, payMethod, {})
      .then(function (res) {
        var rec = DB.push("payments", {
          id: res.txnId,
          name: currentOrder.name,
          room: currentOrder.room,
          feeType: currentOrder.feeType,
          amount: currentOrder.amount,
          method: res.method,
          status: "SUCCESS",
          createdAt: Date.now()
        });
        document.getElementById("rTxn").textContent = rec.id;
        document.getElementById("rAmt").textContent = inr(rec.amount);
        document.getElementById("rType").textContent = rec.feeType;
        document.getElementById("rStudent").textContent = rec.name + " (" + rec.room + ")";
        document.getElementById("rMethod").textContent = rec.method;
        document.getElementById("rDate").textContent = fmtDateTime(rec.createdAt);
        document.getElementById("payStepForm").hidden = true;
        document.getElementById("payStepReceipt").hidden = false;
        document.getElementById("receiptDone").focus();
        renderHistory();
        btn.disabled = false;
        btn.innerHTML = original;
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.innerHTML = original;
        toast("Payment failed: " + err.message, "error");
      });
  });

  /* live input formatting: card number groups + expiry slash */
  document.getElementById("ccNum").addEventListener("input", function () {
    var d = this.value.replace(/\D/g, "").slice(0, 16);
    this.value = d.replace(/(.{4})/g, "$1 ").trim();
  });
  document.getElementById("ccExp").addEventListener("input", function () {
    var d = this.value.replace(/\D/g, "").slice(0, 4);
    this.value = d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  });
  document.getElementById("ccCvv").addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 4);
  });
});
