import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { verifyMessage } from "ethers";
import jwt from "jsonwebtoken";

const router = express.Router();

// --------------------------------------------------
// File path for ValutX member wallet list
// --------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const membersPath = path.join(
  __dirname,
  "../data/valutxMembers.json"
);

// --------------------------------------------------
// Temporary storage for authentication challenges
// --------------------------------------------------

const nonceStore = new Map();

// --------------------------------------------------
// Helper: Read ValutX members
// --------------------------------------------------

const getValutXMembers = () => {
  try {
    const fileData = fs.readFileSync(
      membersPath,
      "utf-8"
    );

    const data = JSON.parse(fileData);

    return data.wallets || [];
  } catch (error) {
    console.error(
      "Unable to read ValutX member list:",
      error
    );

    return [];
  }
};

// ==================================================
// STEP 1
// Generate authentication message
// ==================================================

router.post("/web3/nonce", (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required.",
      });
    }

    const nonce = crypto
      .randomBytes(16)
      .toString("hex");

    const message = `TGPS Community X Login
Wallet: ${address}
Nonce: ${nonce}
Sign this message to prove that you own this wallet.

No transaction will be made and no gas fee is required.`;

    nonceStore.set(address.toLowerCase(), {
      nonce,
      message,
      createdAt: Date.now(),
    });

    return res.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Nonce error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create authentication message.",
    });
  }
});

// ==================================================
// STEP 2
// Verify wallet signature + ValutX membership
// ==================================================

router.post("/web3/verify", async (req, res) => {
  try {
    const {
      address,
      message,
      signature,
    } = req.body;

    // ----------------------------------------------
    // Validate request
    // ----------------------------------------------

    if (!address || !message || !signature) {
      return res.status(400).json({
        success: false,
        message:
          "Address, message and signature are required.",
      });
    }

    // ----------------------------------------------
    // Find stored challenge
    // ----------------------------------------------

    const storedChallenge = nonceStore.get(
      address.toLowerCase()
    );

    if (!storedChallenge) {
      return res.status(400).json({
        success: false,
        message:
          "Authentication session expired. Please try again.",
      });
    }

    // ----------------------------------------------
    // Make sure message was created by our backend
    // ----------------------------------------------

    if (storedChallenge.message !== message) {
      return res.status(400).json({
        success: false,
        message: "Invalid authentication message.",
      });
    }

    // ----------------------------------------------
    // Verify MetaMask signature
    // ----------------------------------------------

    const recoveredAddress = verifyMessage(
      message,
      signature
    );

    console.log(
      "Claimed address:",
      address
    );

    console.log(
      "Recovered address:",
      recoveredAddress
    );

    // ----------------------------------------------
    // Compare wallet addresses
    // ----------------------------------------------

    if (
      recoveredAddress.toLowerCase() !==
      address.toLowerCase()
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Wallet signature verification failed.",
      });
    }

    // ----------------------------------------------
    // Wallet ownership verified
    // ----------------------------------------------

    console.log(
      "Wallet ownership verified."
    );

    // ----------------------------------------------
    // Check ValutX membership
    // ----------------------------------------------

    const valutxMembers = getValutXMembers();

    const isValutXMember =
      valutxMembers.some(
        (wallet) =>
          wallet.toLowerCase() ===
          recoveredAddress.toLowerCase()
      );

    console.log(
      "ValutX member:",
      isValutXMember
    );

    // ----------------------------------------------
    // Remove used nonce
    // ----------------------------------------------

    nonceStore.delete(
      address.toLowerCase()
    );

    // ----------------------------------------------
    // Wallet is NOT a ValutX member
    // ----------------------------------------------

    if (!isValutXMember) {
      return res.status(403).json({
        success: false,
        code: "NOT_VALUTX_MEMBER",
        message:
          "This wallet is not registered as a ValutX member.",
        walletAddress: recoveredAddress,
        isValutXMember: false,
      });
    }

    // ----------------------------------------------
    // Create JWT authentication token
    // ----------------------------------------------

    const token = jwt.sign(
      {
        walletAddress:
          recoveredAddress.toLowerCase(),

        isValutXMember: true,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // ----------------------------------------------
    // Wallet IS a ValutX member
    // ----------------------------------------------

    return res.json({
      success: true,

      message:
        "Wallet verified and ValutX membership confirmed.",

      walletAddress: recoveredAddress,

      isValutXMember: true,

      token,
    });
  } catch (error) {
    console.error(
      "Wallet verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Wallet verification failed.",
    });
  }
});

export default router;