const path = require("path");
const fs = require("fs");

const { initializeApp, getApps, getApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

let initError = null;

function resolveCredentialsPath() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) return null;
  if (path.isAbsolute(credPath)) return credPath;
  return path.resolve(process.cwd(), credPath);
}

function normalizePrivateKey(key) {
  if (!key) return key;
  return String(key).replace(/\\n/g, "\n");
}

function loadServiceAccountFromEnv() {
  // Supports base64 JSON: FIREBASE_SERVICE_ACCOUNT=eyJ...
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!encoded) return null;

  try {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    if (parsed.private_key) {
      parsed.private_key = normalizePrivateKey(parsed.private_key);
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT is invalid base64 JSON: ${error.message}`,
    );
  }
}

function loadServiceAccountFromFile() {
  const credFile = resolveCredentialsPath();
  if (!credFile || !fs.existsSync(credFile)) return null;

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serviceAccount = require(credFile);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = normalizePrivateKey(
      serviceAccount.private_key,
    );
  }
  return serviceAccount;
}

function initializeFirebase() {
  try {
    if (getApps().length > 0) {
      return true;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || undefined;
    const serviceAccount =
      loadServiceAccountFromEnv() || loadServiceAccountFromFile();

    if (serviceAccount) {
      initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id || projectId,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
        projectId: projectId || serviceAccount.project_id,
      });

      console.log(
        `Firebase Admin initialized (project: ${
          projectId || serviceAccount.project_id
        })`,
      );
      return true;
    }

    initError =
      "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT (base64) or GOOGLE_APPLICATION_CREDENTIALS (file path)";
    console.warn(initError);
    return false;
  } catch (error) {
    initError = error.message;
    console.error("Firebase Admin init failed:", error.message);
    return false;
  }
}

function getFirebaseAuth() {
  if (!initializeFirebase()) {
    const error = new Error(
      initError || "Firebase Admin is not configured on the server",
    );
    error.statusCode = 503;
    throw error;
  }
  return getAuth(getApp());
}

async function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    const error = new Error("idToken is required");
    error.statusCode = 400;
    throw error;
  }

  const token = idToken.trim();

  try {
    return await getFirebaseAuth().verifyIdToken(token, false);
  } catch (error) {
    console.error("Firebase verifyIdToken failed:", {
      code: error.code,
      message: error.message,
    });

    let message = "Invalid Google token. Please sign in again.";
    if (error.code === "auth/id-token-expired") {
      message = "Google session expired. Please sign in again.";
    } else if (error.code === "auth/argument-error") {
      message =
        "Invalid Google token format. Make sure the frontend sends Firebase idToken from user.getIdToken().";
    } else if (
      error.message?.includes("aud") ||
      error.message?.includes("audience") ||
      error.message?.includes("project")
    ) {
      message =
        "Firebase project mismatch. Backend FIREBASE_PROJECT_ID / service account must match the web app project (fellini-82332).";
    }

    const err = new Error(message);
    err.statusCode = 401;
    err.firebaseCode = error.code;
    err.firebaseMessage = error.message;
    throw err;
  }
}

module.exports = {
  initializeFirebase,
  getFirebaseAuth,
  verifyIdToken,
};
