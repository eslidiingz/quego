import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  createLocalJWKSet,
  type JWTVerifyGetKey,
} from "jose";
import { verifyFirebaseIdToken } from "./admin";

// A Firebase ID token is an RS256 JWT signed by Google. We can't reach Google's
// private key, but we CAN mint structurally-identical tokens with our own RS256
// key pair and verify them against a matching local JWK set — exercising every
// accept/reject branch of the real verifier without any network or Admin SDK.

const PROJECT_ID = "quego-test-project";
const ISSUER = `https://securetoken.google.com/${PROJECT_ID}`;
const KID = "test-key-1";
const VALID_E164 = "+66812345678";
const VALID_LOCAL = "0812345678";

let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let wrongPrivateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let keySet: JWTVerifyGetKey;

beforeAll(async () => {
  const real = await generateKeyPair("RS256", { extractable: true });
  privateKey = real.privateKey;
  const jwk = await exportJWK(real.publicKey);
  keySet = createLocalJWKSet({
    keys: [{ ...jwk, kid: KID, alg: "RS256", use: "sig" }],
  });

  // A second key pair NOT in the JWK set — used to forge an otherwise-valid token.
  const forged = await generateKeyPair("RS256", { extractable: true });
  wrongPrivateKey = forged.privateKey;
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", PROJECT_ID);
  // The verifier logs every rejection by design; silence it so the suite is quiet.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

type TokenOpts = {
  /** null omits the phone_number claim entirely. */
  phoneNumber?: string | null;
  sub?: string;
  issuer?: string;
  audience?: string;
  /** Passed to jose `setExpirationTime` (string like "1h" or epoch seconds). */
  expiresIn?: string | number;
  signWith?: typeof privateKey;
  kid?: string;
  /** Epoch seconds for `iat`; default now. */
  issuedAt?: number;
  /** Epoch seconds for `auth_time`; default now. null omits the claim. */
  authTime?: number | null;
};

async function makeToken(opts: TokenOpts = {}): Promise<string> {
  const {
    phoneNumber = VALID_E164,
    sub = "firebase-uid-123",
    issuer = ISSUER,
    audience = PROJECT_ID,
    expiresIn = "1h",
    signWith = privateKey,
    kid = KID,
    issuedAt = Math.floor(Date.now() / 1000),
    authTime = Math.floor(Date.now() / 1000),
  } = opts;
  const claims: Record<string, unknown> = {};
  if (phoneNumber !== null) claims.phone_number = phoneNumber;
  if (authTime !== null) claims.auth_time = authTime;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresIn)
    .sign(signWith);
}

describe("verifyFirebaseIdToken", () => {
  it("accepts a genuine token and returns the normalized phone + uid", async () => {
    const token = await makeToken();
    expect(await verifyFirebaseIdToken(token, keySet)).toEqual({
      phone: VALID_LOCAL,
      firebaseUid: "firebase-uid-123",
    });
  });

  it("rejects a token minted for a different project (aud)", async () => {
    const token = await makeToken({ audience: "someone-elses-project" });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects a token from an unexpected issuer", async () => {
    const token = await makeToken({ issuer: "https://evil.example.com/x" });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await makeToken({
      expiresIn: Math.floor(Date.now() / 1000) - 60,
    });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects a token signed by a key that isn't in the JWK set (forged)", async () => {
    const token = await makeToken({ signWith: wrongPrivateKey });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects a token with no phone_number claim", async () => {
    const token = await makeToken({ phoneNumber: null });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects a non-Thai phone number", async () => {
    const token = await makeToken({ phoneNumber: "+14155552671" });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects a token with an empty sub (uid)", async () => {
    const token = await makeToken({ sub: "" });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects a token issued more than 10 minutes ago (replay)", async () => {
    const elevenMinAgo = Math.floor(Date.now() / 1000) - 11 * 60;
    const token = await makeToken({ issuedAt: elevenMinAgo, authTime: elevenMinAgo });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects a freshly refreshed token whose SMS proof (auth_time) is old", async () => {
    const yesterday = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const token = await makeToken({ authTime: yesterday });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects a token with auth_time in the future", async () => {
    const token = await makeToken({ authTime: Math.floor(Date.now() / 1000) + 3600 });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("rejects a token with no auth_time claim", async () => {
    const token = await makeToken({ authTime: null });
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });

  it("accepts an SMS proof from 9 minutes ago", async () => {
    const nineMinAgo = Math.floor(Date.now() / 1000) - 9 * 60;
    const token = await makeToken({ issuedAt: nineMinAgo, authTime: nineMinAgo });
    expect(await verifyFirebaseIdToken(token, keySet)).not.toBeNull();
  });

  it("fails closed when NEXT_PUBLIC_FIREBASE_PROJECT_ID is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
    const token = await makeToken();
    expect(await verifyFirebaseIdToken(token, keySet)).toBeNull();
  });
});
