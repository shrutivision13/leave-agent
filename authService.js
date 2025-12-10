/**
 * Gmail OAuth service for web-based authentication.
 */
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { GMAIL_CREDENTIALS_FILE, GMAIL_SCOPES } from "./config.js";
import { saveTokens, getTokens } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadCredentials() {
  const credentialsPath = path.resolve(__dirname, GMAIL_CREDENTIALS_FILE);
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      `Gmail credentials file not found: ${credentialsPath}\n` +
        "Please download credentials.json from Google Cloud Console."
    );
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const creds = credentials.installed || credentials.web;
  if (!creds) {
    throw new Error(
      'Invalid credentials format. Expected "installed" or "web" property.'
    );
  }
  return creds;
}

export function createOAuthClient() {
  const { client_secret, client_id, redirect_uris } = loadCredentials();
  const redirectUri =
    redirect_uris && redirect_uris.length > 0
      ? redirect_uris[0]
      : "http://localhost:3001/api/auth/callback";
  console.log("🚀 ~ createOAuthClient ~ redirectUri:", redirectUri,client_id,client_secret);
  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

export function generateAuthUrl() {
  const oAuth2Client = createOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
  });
}

export async function handleAuthCallback(code) {
  console.log("🚀 ~ handleAuthCallback ~ code:", code)
  try {
    const oAuth2Client = createOAuthClient();
    const { tokens,...rest } = await oAuth2Client.getToken(code);
    console.log("🚀 ~ handleAuthCallback ~ rest:", rest)
    console.log("🚀 ~ handleAuthCallback ~ tokens:", tokens);
    oAuth2Client.setCredentials(tokens);


    const oauth2 = google.oauth2({ auth: oAuth2Client, version: "v2" });
    const response = await oauth2.userinfo.get();
    console.log("🚀 ~ handleAuthCallback ~ response:", response)
    // Get user email to key the token
    const userEmail = response.data?.email;
   

    await saveTokens(userEmail, tokens);
    return { userEmail, tokens };
  } catch (error) {
    console.log("🚀 ~ handleAuthCallback ~ error:", error?.message);
  }
}

export function getAuthorizedClient(userEmail) {
  // returns a Promise resolving to an auth client or null
  return (async () => {
    const tokens = await getTokens(userEmail);
    if (!tokens) return null;
    const oAuth2Client = createOAuthClient();
    oAuth2Client.setCredentials(tokens);
    return oAuth2Client;
  })();
}
