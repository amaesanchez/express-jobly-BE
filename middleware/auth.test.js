"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../expressError");
const {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdminLoggedIn,
  ensureCurrUserOrAdmin,
} = require("./auth");

const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign({ username: "test", isAdmin: false }, SECRET_KEY);
const badJwt = jwt.sign({ username: "test", isAdmin: false }, "wrong");

function next(err) {
  if (err) throw new Error("Got error from middleware");
}

describe("authenticateJWT", function () {
  test("works: via header", function () {
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        username: "test",
        isAdmin: false,
      },
    });
  });

  test("works: no header", function () {
    const req = {};
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });

  test("works: invalid token", function () {
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });
});

describe("ensureLoggedIn", function () {
  test("works", function () {
    const req = {};
    const res = { locals: { user: { username: "test" } } };
    ensureLoggedIn(req, res, next);
  });

  test("unauth if no login", function () {
    const req = {};
    const res = { locals: {} };
    expect(() => ensureLoggedIn(req, res, next)).toThrowError();
  });
});

describe("ensureAdminLoggedIn", function () {
  test("works", function () {
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: true } } };
    ensureAdminLoggedIn(req, res, next);
  });

  test("unauth if not admin", function () {
    const req = {};
    const res = { locals: { user: { username: "test" } } };
    expect(() => ensureAdminLoggedIn(req, res, next)).toThrowError();
  });
});

describe("ensureCurrUserOrAdmin", function () {
  test("works for current user", function () {
    const req = { params: { username: "test1" } };
    const res = { locals: { user: { username: "test1" } } };
    ensureCurrUserOrAdmin(req, res, next);
  });

  test("works for admin", function () {
    const req = { params: { username: "test2" } };
    const res = { locals: { user: { username: "test2", isAdmin: true } } };
    ensureCurrUserOrAdmin(req, res, next);
  });

  test("unauth if not current user", function () {
    const req = { params: { username: "test3" } };
    const res = { locals: { user: { username: "test1" } } };
    expect(() => ensureCurrUserOrAdmin(req, res, next)).toThrowError();
  });
});
