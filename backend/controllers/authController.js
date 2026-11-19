const { auth, db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

function registrationFailure(error) {
  const code = error?.code || "unknown";
  const messages = {
    "auth/email-already-exists": "This email is already registered.",
    "auth/invalid-credential": "The server Firebase credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON on Render.",
    "auth/project-not-found": "The Firebase project configured on Render could not be found.",
    "permission-denied": "Firebase Admin does not have permission to write the Firestore users collection. Check the Render service account's IAM permissions.",
    "firestore/permission-denied": "Firebase Admin does not have permission to write the Firestore users collection. Check the Render service account's IAM permissions."
  };
  return { code, message: messages[code] || "Registration failed on the server. Check the Render logs for the registration error code." };
}

// STUDENT REGISTRATION
exports.registerStudent = async (req, res) => {
  let createdUser;

  try {
    const { name, email, password, department, rollNumber } = req.body || {};

    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password ||
      typeof department !== "string" || !department.trim() ||
      typeof rollNumber !== "string" || !rollNumber.trim()
    ) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDepartment = department.trim();
    const cleanRollNumber = rollNumber.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must contain at least 8 characters." });
    }

    // Create the Firebase Authentication identity first.
    createdUser = await auth.createUser({
      email: cleanEmail,
      password,
      displayName: cleanName
    });

    // Persist the matching Firestore profile under the same Firebase UID.
    const profileRef = db.collection("users").doc(createdUser.uid);
    await profileRef.create({
      uid: createdUser.uid,
      name: cleanName,
      email: cleanEmail,
      department: cleanDepartment,
      rollNumber: cleanRollNumber,
      role: "student",
      createdAt: FieldValue.serverTimestamp()
    });

    // Read-after-write check: do not report success unless the profile exists.
    const savedProfile = await profileRef.get();
    if (!savedProfile.exists) {
      const error = new Error("Firestore profile verification failed.");
      error.code = "firestore/profile-write-unverified";
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      user: {
        uid: createdUser.uid,
        name: cleanName,
        email: cleanEmail,
        department: cleanDepartment,
        rollNumber: cleanRollNumber,
        role: "student"
      }
    });
  } catch (error) {
    const failure = registrationFailure(error);
    console.error("Registration error:", failure.code, error?.message || "");

    // Keep Auth and Firestore consistent if profile persistence failed.
    if (createdUser) {
      try {
        await db.collection("users").doc(createdUser.uid).delete();
      } catch (rollbackError) {
        console.error("Firestore rollback failed:", rollbackError?.code || rollbackError?.message);
      }
      try {
        await auth.deleteUser(createdUser.uid);
      } catch (rollbackError) {
        console.error("Auth rollback failed:", rollbackError?.code || rollbackError?.message);
      }
    }

    const status = failure.code === "auth/email-already-exists" ? 409 : 500;
    return res.status(status).json({ success: false, code: failure.code, message: failure.message });
  }
};

// GET CURRENT LOGGED-IN USER
exports.getCurrentUser = async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    return res.status(200).json({ success: true, user: userDoc.data() });
  } catch (error) {
    console.error("Get current user error:", error.code || error.message);
    return res.status(500).json({ success: false, message: "Unable to fetch user profile." });
  }
};
