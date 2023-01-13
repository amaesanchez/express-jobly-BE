"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
  testJobIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 50000,
    equity: "0.05",
    companyHandle: "c1",
  };

  test("ok for admins", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    newJob.id = resp.body.job.id;
    expect(resp.body).toEqual({
      job: newJob,
    });
  });

  test("not ok for users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401,
      },
    });
  });

  test("not ok for anon", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401,
      },
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "new",
        salary: 10,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        equity: true,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const { j1Id, j2Id, j3Id } = testJobIds;
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: j1Id,
          title: "j1",
          salary: 10000,
          equity: "0.001",
          companyHandle: "c1",
          companyName: "C1"
        },
        {
          id: j2Id,
          title: "j2",
          salary: 20000,
          equity: "0.002",
          companyHandle: "c3",
          companyName: "C3"
        },
        {
          id: j3Id,
          title: "j3",
          salary: 30000,
          equity: null,
          companyHandle: "c3",
          companyName: "C3"
        },
      ],
    });
  });

  test("works with filters: title, minSalary, hasEquity", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app).get("/jobs").query({
      title: "1",
      minSalary: 10000,
      hasEquity: true,
    });

    expect(resp.body).toEqual({
      jobs: [
        {
          id: j1Id,
          title: "j1",
          salary: 10000,
          equity: "0.001",
          companyHandle: "c1",
          companyName: "C1"
        },
      ],
    });
  });

  test("works with hasEquity filter set to false", async function () {
    const { j3Id } = testJobIds;
    const resp = await request(app).get("/jobs").query({
      title: "3",
      minSalary: 20000,
      hasEquity: "false",
    });

    expect(resp.body).toEqual({
      jobs: [
        {
          id: j3Id,
          title: "j3",
          salary: 30000,
          equity: null,
          companyHandle: "c3",
          companyName: "C3"
        },
      ],
    });
  });

  test("doesn't work: pass filters with invalid datatypes", async function () {
    const resp = await request(app).get("/jobs").query({
      minSalary: "test",
    });

    expect(resp.body.error).toEqual({
      message: ["instance.minSalary is not of a type(s) integer"],
      status: 400,
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app).get(`/jobs/${j1Id}`);
    expect(resp.body).toEqual({
      job: {
        id: j1Id,
        title: "j1",
        salary: 10000,
        equity: "0.001",
        companyHandle: "c1",
        company: {
          name: "C1",
          numEmployees: 1,
          description: 'Desc1',
          logoUrl: 'http://c1.img'
        }
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/job/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admins", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app)
      .patch(`/jobs/${j1Id}`)
      .send({
        title: "j1-new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        id: j1Id,
        title: "j1-new",
        salary: 10000,
        equity: "0.001"
      },
    });
  });

  test("doesn't work for users", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app)
      .patch(`/jobs/${j1Id}`)
      .send({
        title: "j1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401,
      },
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app).patch(`/jobs/${j1Id}`).send({
      title: "j1-new",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/0`)
      .send({
        title: "j0-new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app)
      .patch(`/jobs/${j1Id}`)
      .send({
        id: 555555,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app)
      .patch(`/jobs/${j1Id}`)
      .send({
        salary: "not-an-integer",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admins", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app)
      .delete(`/jobs/${j1Id}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: j1Id });
  });

  test("doesnt work for users", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app)
      .delete(`/jobs/${j1Id}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401,
      },
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const { j1Id } = testJobIds;
    const resp = await request(app).delete(`/jobs/${j1Id}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/0`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
