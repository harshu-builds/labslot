
require("dotenv").config();

const { auth, db } = require("../config/firebase");

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || "Lab Administrator";

    if (!email || !password) {
      throw new Error("Admin credentials missing from environment");
    }

    // Create Firebase Authentication account
    let user;

    try {
      user = await auth.getUserByEmail(email);
      console.log("Admin account already exists:", user.uid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;

      user = await auth.createUser({
        email,
        password,
        displayName: name
      });
    }

    // Create or update admin profile
// Create admin profile without overwriting existing data
const userRef = db.collection("users").doc(user.uid);
const existingProfile = await userRef.get();

if (!existingProfile.exists) {
  await userRef.set({
    uid: user.uid,
    name: user.displayName || name,
    email: user.email,
    role: "admin",
    createdAt: new Date()
  });
  console.log("Admin profile created.");
} else {
  const data = existingProfile.data();
  if (data.role !== "admin") {
    throw new Error("Existing account is not an admin. Refusing to change its role automatically.");
  }
  console.log("Existing admin profile preserved.");
}

    console.log("Administrator configured successfully!");

  } catch (error) {
    console.error("Admin creation failed:", error);
    process.exitCode = 1;
  }
}

createAdmin();
