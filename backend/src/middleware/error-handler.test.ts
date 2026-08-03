import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { AppError, errorHandler } from "./error-handler.js";

/** Minimal Express response double that records what was sent. */
function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: any };
}

const run = (err: unknown) => {
  const res = mockRes();
  errorHandler(err as Error, {} as Request, res, vi.fn());
  return res;
};

describe("errorHandler", () => {
  describe("Zod validation errors", () => {
    it("reports a real ZodError as 400", async () => {
      const { z } = await import("zod");
      const result = z.object({ month: z.number().max(12) }).safeParse({ month: 13 });
      expect(result.success).toBe(false);
      if (result.success) return;

      const res = run(result.error);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it("reports a ZodError from a different module instance as 400", () => {
      // Regression: @csp/shared is built as CommonJS while the server runs as
      // ESM, so schemas defined in shared throw the ZodError class from zod's
      // CJS build. `instanceof` against the ESM class returns false, and every
      // validation failure from a shared schema surfaced as a 500 instead of a
      // 400. This stand-in has the right shape but is not the same class.
      const foreign = Object.assign(new Error("Invalid input"), {
        name: "ZodError",
        issues: [{ code: "too_big", path: ["targets"], message: "Too many" }],
      });

      const res = run(foreign);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Validation Error");
      expect(res.body.details).toHaveLength(1);
    });

    it("does not mistake an ordinary error named ZodError for one", () => {
      // Name alone is not enough — the issues array is what makes it parseable.
      const impostor = Object.assign(new Error("boom"), { name: "ZodError" });
      expect(run(impostor).statusCode).toBe(500);
    });
  });

  describe("application errors", () => {
    it("uses the status code carried by AppError", () => {
      const res = run(new AppError("Spending plan not found", 404));
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Spending plan not found");
    });

    it("passes through a 409 conflict", () => {
      expect(run(new AppError("Already exists", 409)).statusCode).toBe(409);
    });
  });

  describe("unexpected errors", () => {
    it("returns 500", () => {
      expect(run(new Error("kaboom")).statusCode).toBe(500);
    });

    it("does not leak the internal message or a stack trace", () => {
      const res = run(new Error("Prisma: connection string user:password@host"));
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("Prisma");
      expect(serialized).not.toContain("stack");
      expect(res.body.message).toMatch(/unexpected error/i);
    });
  });
});
