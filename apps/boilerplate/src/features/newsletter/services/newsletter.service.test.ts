import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resendCreate: vi.fn(),
  resendSegmentId: undefined as string | undefined,
}));

vi.mock("@/config", () => ({
  env: {
    email: {
      get resendSegmentId() {
        return mocks.resendSegmentId;
      },
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    collectedEmail: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/resend-client", () => ({
  getResend: () => ({
    contacts: { create: mocks.resendCreate },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

describe("addNewsletterContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resendSegmentId = undefined;
    mocks.resendCreate.mockResolvedValue({ data: { id: "contact_123" }, error: null });
  });

  it("creates a Resend contact without a segment when RESEND_SEGMENT_ID is not configured", async () => {
    const { addNewsletterContact } = await import("./newsletter.service");

    const result = await addNewsletterContact({ email: "builder@example.com" });

    expect(result).toEqual({ success: true, data: { id: "contact_123" } });
    expect(mocks.resendCreate).toHaveBeenCalledWith({
      email: "builder@example.com",
      firstName: undefined,
      lastName: undefined,
    });
    expect(mocks.resendCreate.mock.calls[0][0]).not.toHaveProperty("audienceId");
  });

  it("creates a Resend contact in the configured segment", async () => {
    mocks.resendSegmentId = "segment_123";
    const { addNewsletterContact } = await import("./newsletter.service");

    const result = await addNewsletterContact({
      email: "builder@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
    });

    expect(result).toEqual({ success: true, data: { id: "contact_123" } });
    expect(mocks.resendCreate).toHaveBeenCalledWith({
      email: "builder@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      segments: [{ id: "segment_123" }],
    });
    expect(mocks.resendCreate.mock.calls[0][0]).not.toHaveProperty("audienceId");
  });
});
