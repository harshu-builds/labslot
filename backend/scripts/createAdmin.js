
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
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      name,
      email,
      role: "admin",
      createdAt: new Date()
    });

    console.log("Administrator configured successfully!");

  } catch (error) {
    console.error("Admin creation failed:", error);
    process.exitCode = 1;
  }
}

createAdmin();
