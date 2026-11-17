const { db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

const usersCollection = () => db.collection("users");
const editableFields = ["name", "department", "rollNumber", "year", "phone"];

const toStudent = (doc) => {
  const data = doc.data();
  return {
    uid: doc.id,
    name: data.name || "",
    email: data.email || "",
    department: data.department || "",
    rollNumber: data.rollNumber || "",
    year: data.year || null,
    phone: data.phone || "",
    createdAt: data.createdAt || null
  };
};

exports.listStudents = async (req, res) => {
  try {
    const snapshot = await usersCollection().where("role", "==", "student").get();
    const students = snapshot.docs.map(toStudent);
    students.sort((a, b) => a.name.localeCompare(b.name));
    return res.status(200).json({ success: true, count: students.length, students });
  } catch (error) {
    console.error("List students error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch students" });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const doc = await usersCollection().doc(req.params.id).get();
    if (!doc.exists || doc.data().role !== "student") return res.status(404).json({ success: false, message: "Student not found" });
    return res.status(200).json({ success: true, student: toStudent(doc) });
  } catch (error) {
    console.error("Get student error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch student" });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const ref = usersCollection().doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().role !== "student") return res.status(404).json({ success: false, message: "Student not found" });

    const updates = {};
    for (const field of editableFields) {
      if (req.body?.[field] === undefined) continue;
      const value = req.body[field];
      if (field === "year") {
        if (value !== null && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 8)) {
          return res.status(400).json({ success: false, message: "Year must be a whole number between 1 and 8" });
        }
        updates.year = value === null ? null : Number(value);
      } else {
        if (typeof value !== "string" || !value.trim()) return res.status(400).json({ success: false, message: `${field} must be a non-empty string` });
        updates[field] = value.trim();
      }
    }

    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "No editable student fields supplied" });
    updates.updatedAt = FieldValue.serverTimestamp();
    await ref.update(updates);
    const updated = await ref.get();
    return res.status(200).json({ success: true, message: "Student profile updated", student: toStudent(updated) });
  } catch (error) {
    console.error("Update student error:", error);
    return res.status(500).json({ success: false, message: "Unable to update student profile" });
  }
};
