import { describe, expect, it } from "vitest";
import { clientIpFromRequest } from "./client-ip";

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/", { headers });
}

describe("clientIpFromRequest", () => {
  it("returns the first entry of X-Forwarded-For", () => {
    const request = makeRequest({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" });
    expect(clientIpFromRequest(request)).toBe("203.0.113.5");
  });

  it("trims whitespace around the first entry", () => {
    const request = makeRequest({ "x-forwarded-for": "  203.0.113.5  , 70.41.3.18" });
    expect(clientIpFromRequest(request)).toBe("203.0.113.5");
  });

  it("returns 'unknown' when the header is absent", () => {
    const request = makeRequest({});
    expect(clientIpFromRequest(request)).toBe("unknown");
  });
});
