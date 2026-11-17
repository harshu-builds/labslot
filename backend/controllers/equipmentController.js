const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const equipmentCollection = () => db.collection("equipment");
const allowedStatuses = ["available", "limited", "unavailable", "maintenance"];
const cleanText = (value) => typeof value === "string" ? value.trim() : "";

exports.listEquipment = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = equipmentCollection();
    if (category) query = query.where("category", "==", String(category).trim());
    if (status) {
      if (!allowedStatuses.includes(String(status))) return res.status(400).json({ success: false, message: "Invalid equipment status" });
      query = query.where("status", "==", String(status));
    }
    const snapshot = await query.get();
    let equipment = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (search) {
      const term = String(search).trim().toLowerCase();
      equipment = equipment.filter((item) => [item.name, item.category, item.description, item.location].some((value) => String(value || "").toLowerCase().includes(term)));
    }
    equipment.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    return res.status(200).json({ success: true, count: equipment.length, equipment });
  } catch (error) {
    console.error("List equipment error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch equipment" });
  }
};

exports.getEquipmentById = async (req, res) => {
  try {
    const doc = await equipmentCollection().doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Equipment not found" });
    return res.status(200).json({ success: true, equipment: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Get equipment error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch equipment" });
  }
};

exports.createEquipment = async (req, res) => {
  try {
    const { name, category, description = "", imageUrl = "", location = "", quantity = 1, status = "available" } = req.body || {};
    if (!cleanText(name) || !cleanText(category)) return res.status(400).json({ success: false, message: "Equipment name and category are required" });
    if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: "Invalid equipment status" });
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) return res.status(400).json({ success: false, message: "Quantity must be a positive whole number" });
    const payload = {
      name: cleanText(name), category: cleanText(category), description: cleanText(description),
      imageUrl: cleanText(imageUrl), location: cleanText(location), quantity: parsedQuantity,
      status, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      createdBy: req.user.uid
    };
    const ref = await equipmentCollection().add(payload);
    return res.status(201).json({ success: true, message: "Equipment created", equipment: { id: ref.id, ...payload } });
  } catch (error) {
    console.error("Create equipment error:", error);
    return res.status(500).json({ success: false, message: "Unable to create equipment" });
  }
};

exports.updateEquipment = async (req, res) => {
  try {
    const ref = equipmentCollection().doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Equipment not found" });
    const body = req.body || {};
    const updates = {};
    for (const field of ["name", "category", "description", "imageUrl", "location"]) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string" || (["name", "category"].includes(field) && !body[field].trim())) return res.status(400).json({ success: false, message: `Invalid ${field}` });
        updates[field] = body[field].trim();
      }
    }
    if (body.quantity !== undefined) {
      const quantity = Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ success: false, message: "Quantity must be a positive whole number" });
      updates.quantity = quantity;
    }
    if (body.status !== undefined) {
      if (!allowedStatuses.includes(body.status)) return res.status(400).json({ success: false, message: "Invalid equipment status" });
      updates.status = body.status;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "No valid fields supplied" });
    updates.updatedAt = FieldValue.serverTimestamp();
    await ref.update(updates);
    const updated = await ref.get();
    return res.status(200).json({ success: true, message: "Equipment updated", equipment: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("Update equipment error:", error);
    return res.status(500).json({ success: false, message: "Unable to update equipment" });
  }
};

exports.updateEquipmentStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: "Status must be available, unavailable, or maintenance" });
    const ref = equipmentCollection().doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Equipment not found" });
    await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
    return res.status(200).json({ success: true, message: "Equipment status updated", id: ref.id, status });
  } catch (error) {
    console.error("Update equipment status error:", error);
    return res.status(500).json({ success: false, message: "Unable to update equipment status" });
  }
};

exports.deleteEquipment = async (req, res) => {
  try {
    const ref = equipmentCollection().doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Equipment not found" });
    await ref.delete();
    return res.status(200).json({ success: true, message: "Equipment deleted", id: ref.id });
  } catch (error) {
    console.error("Delete equipment error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete equipment" });
  }
};
