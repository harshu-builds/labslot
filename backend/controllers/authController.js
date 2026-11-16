
const { auth, db } = require("../config/firebase");
const { FieldValue } = require("firebase-admin/firestore");

// STUDENT REGISTRATION
exports.registerStudent = async (req, res) => {
  let createdUser;

  try {
    const {
      name,
      email,
      password,
      department,
      rollNumber
    } = req.body || {};

    // Validate required fields
    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !department?.trim() ||
      !rollNumber?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDepartment = department.trim();
    const cleanRollNumber = rollNumber.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters"
      });
    }

    // Create Firebase Authentication user
    createdUser = await auth.createUser({
      email: cleanEmail,
      password,
      displayName: cleanName
    });

    // Create Firestore profile using Firebase UID as document ID
    await db.collection("users").doc(createdUser.uid).set({
      uid: createdUser.uid,
      name: cleanName,
      email: cleanEmail,
      department: cleanDepartment,
      rollNumber: cleanRollNumber,
      role: "student",
      createdAt: FieldValue.serverTimestamp()
    });

    return res.status(201).json({
      success: true,
      message: "Student registered successfully",
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
    console.error("Registration error:", error.code || error.message);

    // Roll back Authentication account if Firestore creation fails
    if (createdUser) {
      try {
        await auth.deleteUser(createdUser.uid);
      } catch (rollbackError) {
        console.error("Account rollback failed:", rollbackError.code);
      }
    }

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({
        success: false,
        message: "Email is already registered"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again."
    });
  }
};

// GET CURRENT LOGGED-IN USER
exports.getCurrentUser = async (req, res) => {
  try {
    const userDoc = await db
      .collection("users")
      .doc(req.user.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: userDoc.data()
    });

  } catch (error) {
    console.error("Get current user error:", error.code || error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch user profile"
    });
  }
};
