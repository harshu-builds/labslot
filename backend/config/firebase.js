const { initializeApp, cert, applicationDefault, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("node:fs");
const path = require("node:path");

function getCredential() {
  // Recommended for Render/production: store the service-account JSON as an environment variable.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return cert(serviceAccount);
  }

  // Local development: use the ignored serviceAccountKey.json file.
  const localKeyPath = path.join(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(localKeyPath)) {
    return cert(require(localKeyPath));
  }

  // Also supports GOOGLE_APPLICATION_CREDENTIALS / Google-hosted environments.
  return applicationDefault();
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: getCredential() });

const auth = getAuth(app);
const db = getFirestore(app);

module.exports = { auth, db };
