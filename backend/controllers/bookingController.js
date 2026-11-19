const { db } = require("../config/firebase");

const bookingsRef = db.collection("bookings");

function timeToMinutes(value) {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;
  return hours * 60 + Number(match[2]);
}
function timesOverlap(first, second) {
  const a = String(first).split(/\s*[–-]\s*/).map(timeToMinutes);
  const b = String(second).split(/\s*[–-]\s*/).map(timeToMinutes);
  if (a.length !== 2 || b.length !== 2 || [...a, ...b].some((value) => value === null)) return first === second;
  return a[0] < b[1] && b[0] < a[1];
}

function serialize(doc) {
  const data = doc.data();
  return { id: doc.id, ...data, createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt ?? null };
}

exports.createBooking = async (req, res) => {
  try {
    const { equipmentId, date, time, purpose, details = "" } = req.body;
    if (!equipmentId || !date || !time || !purpose?.trim()) {
      return res.status(400).json({ success: false, message: "Equipment, date, time and purpose are required." });
    }
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({ success: false, message: "Please provide a valid booking date." });
    }
    if (purpose.trim().length > 500 || String(details || "").length > 2000) {
      return res.status(400).json({ success: false, message: "Purpose or notes are too long." });
    }
    const requestedRange = String(time).split(/\s*[–-]\s*/).map(timeToMinutes);
    if (requestedRange.length !== 2 || requestedRange.some((value) => value === null) || requestedRange[0] >= requestedRange[1]) {
      return res.status(400).json({ success: false, message: "Please select a valid time slot." });
    }
    const profileSnap = await db.collection("users").doc(req.user.uid).get();
    if (!profileSnap.exists || profileSnap.data().role !== "student") {
      return res.status(403).json({ success: false, message: "Only student accounts can create bookings." });
    }
    const equipmentSnap = await db.collection("equipment").doc(equipmentId).get();
    if (!equipmentSnap.exists) return res.status(404).json({ success: false, message: "Equipment not found." });
    const equipment = equipmentSnap.data();
    if (equipment.status !== "available" || Number(equipment.quantity ?? 0) < 1) {
      return res.status(409).json({ success: false, message: "This equipment is not currently available." });
    }
    const existing = await bookingsRef.where("equipmentId", "==", equipmentId).get();
    const conflict = existing.docs.some((doc) => {
      const booking = doc.data();
      return booking.date === date && ["Pending", "Approved"].includes(booking.status) && timesOverlap(booking.time, time);
    });
    if (conflict) return res.status(409).json({ success: false, message: "This time slot overlaps an existing request. Choose another slot." });
    const profile = profileSnap.data();
    const doc = await bookingsRef.add({
      studentUid: req.user.uid,
      student: profile.name,
      email: profile.email,
      equipmentId, equipmentName: equipment.name,
      date, time, purpose: purpose.trim(), details: String(details || "").trim(),
      status: "Pending", createdAt: new Date()
    });
    const saved = await doc.get();
    return res.status(201).json({ success: true, booking: serialize(saved), message: "Your booking request has been sent to the administrator." });
  } catch (error) {
    console.error("Create booking error:", error);
    return res.status(500).json({ success: false, message: "Unable to create booking." });
  }
};

exports.listBookings = async (req, res) => {
  try {
    const snapshot = await bookingsRef.orderBy("createdAt", "desc").get();
    return res.json({ success: true, bookings: snapshot.docs.map(serialize) });
  } catch (error) {
    console.error("List bookings error:", error);
    return res.status(500).json({ success: false, message: "Unable to load bookings." });
  }
};

exports.listMyBookings = async (req, res) => {
  try {
    const snapshot = await bookingsRef.where("studentUid", "==", req.user.uid).get();
    const bookings = snapshot.docs.map(serialize).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return res.json({ success: true, bookings });
  } catch (error) {
    console.error("List student bookings error:", error);
    return res.status(500).json({ success: false, message: "Unable to load your bookings." });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected", "Cancelled", "Completed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid booking status." });
    }
    const ref = bookingsRef.doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ success: false, message: "Booking not found." });
    const currentStatus = snap.data().status;
    const allowedNext = currentStatus === "Pending"
      ? ["Approved", "Rejected", "Cancelled"]
      : currentStatus === "Approved" ? ["Completed", "Cancelled"] : [];
    if (!allowedNext.includes(status)) {
      return res.status(409).json({ success: false, message: `Cannot change a ${currentStatus} booking to ${status}.` });
    }
    await ref.update({ status, updatedAt: new Date() });
    return res.json({ success: true, booking: serialize(await ref.get()) });
  } catch (error) {
    console.error("Update booking error:", error);
    return res.status(500).json({ success: false, message: "Unable to update booking." });
  }
};

exports.cancelMyBooking = async (req, res) => {
  try {
    const ref = bookingsRef.doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists || snap.data().studentUid !== req.user.uid) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }
    if (snap.data().status !== "Pending") {
      return res.status(409).json({ success: false, message: "Only pending bookings can be cancelled." });
    }
    await ref.update({ status: "Cancelled", updatedAt: new Date() });
    return res.json({ success: true, booking: serialize(await ref.get()) });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ success: false, message: "Unable to cancel booking." });
  }
};
