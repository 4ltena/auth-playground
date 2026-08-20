import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { signAccessToken } from "@/lib/auth/jwt";
import { proxy } from "./proxy";

describe("proxy route guard", () => {
  it("redirects to /login when there is no access_token cookie on /account", async () => {
    const request = new NextRequest("http://localhost/account");
    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=%2Faccount");
  });

  it("passes through /account when the access_token cookie is valid", async () => {
    const token = await signAccessToken({ sub: "u1", email: "a@example.com", role: "USER" });
    const request = new NextRequest("http://localhost/account", {
      headers: { cookie: `access_token=${token}` },
    });
    const response = await proxy(request);
    expect(response.status).toBe(200);
  });

  it("does not touch unprotected routes", async () => {
    const request = new NextRequest("http://localhost/login");
    const response = await proxy(request);
    expect(response.status).toBe(200);
  });

  it("redirects to /login when there is no access_token cookie on /admin", async () => {
    const request = new NextRequest("http://localhost/admin/users");
    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=%2Fadmin%2Fusers");
  });

  it("redirects a non-admin USER away from /admin", async () => {
    const token = await signAccessToken({ sub: "u1", email: "a@example.com", role: "USER" });
    const request = new NextRequest("http://localhost/admin/users", {
      headers: { cookie: `access_token=${token}` },
    });
    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/account");
  });

  it("passes through /admin for an ADMIN token", async () => {
    const token = await signAccessToken({ sub: "u1", email: "admin@example.com", role: "ADMIN" });
    const request = new NextRequest("http://localhost/admin/users", {
      headers: { cookie: `access_token=${token}` },
    });
    const response = await proxy(request);
    expect(response.status).toBe(200);
  });

  it("rejects a tampered access_token on /account", async () => {
    const token = await signAccessToken({ sub: "u1", email: "a@example.com", role: "USER" });
    const request = new NextRequest("http://localhost/account", {
      headers: { cookie: `access_token=${token.slice(0, -2)}xx` },
    });
    const response = await proxy(request);
    expect(response.status).toBe(307);
  });
});
