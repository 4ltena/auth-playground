import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./origin-check";

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/whatever", { method: "POST", headers });
}

describe("isSameOriginRequest", () => {
  it("accepts a matching Origin/Host pair", () => {
    const request = makeRequest({ origin: "http://localhost:3000", host: "localhost:3000" });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects a cross-site Origin", () => {
    const request = makeRequest({ origin: "https://evil.example", host: "localhost:3000" });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects a same-site but cross-subdomain Origin", () => {
    const request = makeRequest({ origin: "https://attacker.localhost:3000", host: "localhost:3000" });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("documents that scheme is not part of the comparison (URL().host excludes it)", () => {
    // A cross-scheme Origin (http vs https) on the same host:port currently
    // passes — browsers set Origin from the real request scheme and never
    // let script forge it, so this isn't attacker-controllable in practice,
    // but it's worth pinning down explicitly rather than leaving it implicit.
    const request = makeRequest({ origin: "https://localhost:3000", host: "localhost:3000" });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("allows a missing Origin header (non-browser clients, some same-origin navigations)", () => {
    const request = makeRequest({ host: "localhost:3000" });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects when Origin is present but Host is missing", () => {
    const request = makeRequest({ origin: "http://localhost:3000" });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects a malformed Origin header", () => {
    const request = makeRequest({ origin: "not a url", host: "localhost:3000" });
    expect(isSameOriginRequest(request)).toBe(false);
  });
});
