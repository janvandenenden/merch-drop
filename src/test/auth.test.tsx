import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams("email=test%40example.com&slug=my-store");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const mockSendVerificationOtp = vi.fn();
const mockSignIn = { emailOtp: vi.fn() };
const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    emailOtp: { sendVerificationOtp: mockSendVerificationOtp },
    signIn: mockSignIn,
    updateUser: mockUpdateUser,
    signOut: mockSignOut,
  },
}));

// ---------------------------------------------------------------------------
// Slug format validation (no network needed)
// ---------------------------------------------------------------------------

const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

describe("creator slug format validation", () => {
  it("accepts valid slugs", () => {
    expect(slugRegex.test("my-store")).toBe(true);
    expect(slugRegex.test("jan")).toBe(true);
    expect(slugRegex.test("store123")).toBe(true);
    expect(slugRegex.test("a")).toBe(true);
    expect(slugRegex.test("my-store-2024")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(slugRegex.test("-leading")).toBe(false);
    expect(slugRegex.test("trailing-")).toBe(false);
    expect(slugRegex.test("UPPERCASE")).toBe(false);
    expect(slugRegex.test("has space")).toBe(false);
    expect(slugRegex.test("has_underscore")).toBe(false);
    expect(slugRegex.test("has.dot")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Signup page
// ---------------------------------------------------------------------------

describe("SignupPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ available: true }),
    });
  });

  afterEach(cleanup);

  async function renderSignup() {
    const { default: SignupPage } = await import("@/app/(auth)/signup/page");
    render(<SignupPage />);
  }

  it("renders email and slug fields", async () => {
    await renderSignup();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });

  it("shows validation error for invalid slug", async () => {
    await renderSignup();
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Username"), "-bad-slug-");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText(/no leading\/trailing hyphens/i);
  });

  it("shows error when slug already taken", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ available: false }),
    });
    await renderSignup();
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Username"), "taken-slug");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText(/already taken/i);
    expect(mockSendVerificationOtp).not.toHaveBeenCalled();
  });

  it("sends OTP and redirects to verify on valid submit", async () => {
    mockSendVerificationOtp.mockResolvedValue({ error: null });
    await renderSignup();
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Username"), "my-store");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(mockSendVerificationOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        type: "sign-in",
      })
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/verify?email=")
    );
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("slug="));
  });

  it("shows error when OTP send fails", async () => {
    mockSendVerificationOtp.mockResolvedValue({
      error: { message: "Rate limit exceeded" },
    });
    await renderSignup();
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText("Username"), "my-store");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText(/rate limit exceeded/i);
  });
});

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

describe("LoginPage", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);

  async function renderLogin() {
    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    render(<LoginPage />);
  }

  it("renders email field", async () => {
    await renderLogin();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("sends OTP and redirects to verify", async () => {
    mockSendVerificationOtp.mockResolvedValue({ error: null });
    await renderLogin();
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));
    await waitFor(() =>
      expect(mockSendVerificationOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        type: "sign-in",
      })
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/verify?email=")
    );
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("slug="));
  });
});

// ---------------------------------------------------------------------------
// Verify page
// ---------------------------------------------------------------------------

describe("VerifyPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSearchParams = new URLSearchParams("email=test%40example.com&slug=my-store");
  });
  afterEach(cleanup);

  async function renderVerify() {
    const { default: VerifyPage } = await import("@/app/(auth)/verify/page");
    render(<VerifyPage />);
  }

  it("renders OTP input", async () => {
    await renderVerify();
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
  });

  it("shows error on invalid OTP", async () => {
    mockSignIn.emailOtp.mockResolvedValue({ data: null, error: { message: "Invalid code" } });
    await renderVerify();
    await userEvent.type(screen.getByLabelText("Code"), "000000");
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    await screen.findByText(/invalid code/i);
  });

  it("signs in, updates slug, and redirects to dashboard on success", async () => {
    mockSignIn.emailOtp.mockResolvedValue({ data: { user: {} }, error: null });
    mockUpdateUser.mockResolvedValue({});
    await renderVerify();
    await userEvent.type(screen.getByLabelText("Code"), "123456");
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    await waitFor(() =>
      expect(mockSignIn.emailOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        otp: "123456",
      })
    );
    expect(mockUpdateUser).toHaveBeenCalledWith({ slug: "my-store" });
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("skips slug update when no slug in params", async () => {
    mockSearchParams = new URLSearchParams("email=test%40example.com");
    mockSignIn.emailOtp.mockResolvedValue({ data: { user: {} }, error: null });
    await renderVerify();
    await userEvent.type(screen.getByLabelText("Code"), "123456");
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
