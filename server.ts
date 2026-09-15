import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Helper to sanitize text input values
function cleanVal(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

// Helper to extract clean 10-digit Indian mobile number for 2Factor.in
function format10DigitPhone(phone?: string): string {
  if (!phone) return "";
  const digitsOnly = phone.toString().replace(/\D/g, "");
  // Take last 10 digits if country code is attached (e.g., +919876543210 -> 9876543210)
  if (digitsOnly.length >= 10) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly;
}

// Resolve 2Factor.in API Key from process.env, .env, or .env.example
function getTwoFactorApiKey(): string {
  let apiKey = cleanVal(process.env.TWOFACTOR_API_KEY) || cleanVal(process.env.TWOFACTOR_SMS_API_KEY);

  if (!apiKey || apiKey.includes("your_2factor") || apiKey.includes("XXXX")) {
    try {
      const envPath = fs.existsSync(path.join(process.cwd(), ".env"))
        ? path.join(process.cwd(), ".env")
        : fs.existsSync(path.join(process.cwd(), ".env.example"))
        ? path.join(process.cwd(), ".env.example")
        : null;

      if (envPath) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        const match = envContent.match(/(?:TWOFACTOR_API_KEY|TWOFACTOR_SMS_API_KEY)\s*=\s*(.*)/);
        if (match && match[1]) {
          const found = cleanVal(match[1]);
          if (found && !found.includes("XXXX")) {
            apiKey = found;
          }
        }
      }
    } catch (e) {
      console.error("Error reading env files for 2Factor.in API Key:", e);
    }
  }

  return cleanVal(apiKey);
}

async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(express.json());

  // API Route: Check 2Factor.in Config Status
  const getStatusHandler = (req: express.Request, res: express.Response) => {
    const apiKey = getTwoFactorApiKey();
    const isConfigured = !!(apiKey && apiKey.length >= 8);

    res.json({
      configured: isConfigured,
      hasApiKey: isConfigured,
      apiKeyMasked: isConfigured ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : null,
      provider: "2Factor.in"
    });
  };

  app.get("/api/2factor-status", getStatusHandler);
  app.get("/api/sms-status", getStatusHandler);
  app.get("/api/fast2sms-status", getStatusHandler); // Legacy alias
  app.get("/api/twilio-status", getStatusHandler); // Legacy alias

  // API Route: Send SMS OTP via 2Factor.in
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { mobileNumber, otpCode, purpose, customApiKey } = req.body;

      if (!mobileNumber) {
        return res.status(400).json({ success: false, error: "Mobile number is required" });
      }

      const target10DigitPhone = format10DigitPhone(mobileNumber);
      if (target10DigitPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: "Valid 10-digit mobile number required for 2Factor.in OTP dispatch"
        });
      }

      const apiKey = cleanVal(customApiKey) || getTwoFactorApiKey();

      if (apiKey && apiKey.length >= 8) {
        console.log(`[2Factor.in Dispatching] OTP: ${otpCode} to Mobile: ${target10DigitPhone}`);

        // 2Factor.in Custom OTP Endpoint: https://2factor.in/API/V1/{API_KEY}/SMS/{PHONE_NUMBER}/{OTP_VAL}
        const twoFactorUrl = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${target10DigitPhone}/${encodeURIComponent(otpCode)}`;

        const response = await fetch(twoFactorUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        });

        const data = await response.json();
        console.log("[2Factor.in API Response]", data);

        if (data && (data.Status === "Success" || data.status === "Success")) {
          return res.json({
            success: true,
            mode: "2factor",
            requestId: data.Details || data.details || `2F-${Date.now()}`,
            recipient: `+91 ${target10DigitPhone}`,
            message: `SMS OTP successfully sent to +91 ${target10DigitPhone} via 2Factor.in`
          });
        } else {
          return res.status(400).json({
            success: false,
            error: data.Details || data.details || data.Message || "2Factor.in API returned failure. Please check your API key or account balance.",
            raw: data
          });
        }
      } else {
        // Fallback / Simulated mode when 2Factor.in API key is not yet set
        console.warn("[2Factor.in] Missing or incomplete TWOFACTOR_API_KEY.");
        return res.json({
          success: true,
          mode: "simulated",
          recipient: `+91 ${target10DigitPhone}`,
          otpCode: otpCode,
          message: `[Dev / Simulated Mode] OTP code is ${otpCode}. Set TWOFACTOR_API_KEY in environment or modal to send real SMS via 2Factor.in.`
        });
      }
    } catch (err: any) {
      console.error("[2Factor.in Error]", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to communicate with 2Factor.in API Gateway",
        details: err.toString()
      });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
