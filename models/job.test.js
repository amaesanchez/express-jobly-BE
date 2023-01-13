"use strict";

const { NotFoundError, BadRequestError } = require("../expressError");
const db = require("../db.js");
const Job = require("./job");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create job", function () {
  const newJob = {
    title: "j3",
    salary: 300000,
    equity: "0.005",
    companyHandle: "c3",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    newJob.id = job.id;
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = $1`,
      [job.id]
    );
    expect(result.rows).toEqual([
      {
        id: job.id,
        title: "j3",
        salary: 300000,
        equity: "0.005",
        company_handle: "c3",
      },
    ]);
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    const { j1Id, j2Id } = testJobIds;
    let jobs = await Job.findAll({});
    expect(jobs).toEqual([
      {
        id: j1Id,
        title: "j1",
        salary: 100000,
        equity: "0.003",
        companyHandle: "c1",
        companyName: "C1"
      },
      {
        id: j2Id,
        title: "j2",
        salary: 200000,
        equity: "0.004",
        companyHandle: "c2",
        companyName: "C2"
      },
    ]);
  });

  test("works: with filter for all 3 params", async function () {
    const { j1Id } = testJobIds;
    let jobs = await Job.findAll({
      title: "j1",
      minSalary: 100000,
      hasEquity: true,
    });

    expect(jobs).toEqual([
      {
        id: j1Id,
        title: "j1",
        salary: 100000,
        equity: "0.003",
        companyHandle: "c1",
        companyName: "C1"
      },
    ]);
  });

  test("works: with filter for 1 param", async function () {
    const { j2Id } = testJobIds;
    let jobs = await Job.findAll({
      title: "2",
    });

    expect(jobs).toEqual([
      {
        id: j2Id,
        title: "j2",
        salary: 200000,
        equity: "0.004",
        companyHandle: "c2",
        companyName: "C2"
      },
    ]);
  });

  test("works: with no filters", async function () {
    const { j1Id, j2Id } = testJobIds;
    let jobs = await Job.findAll({});

    expect(jobs).toEqual([
      {
        id: j1Id,
        title: "j1",
        salary: 100000,
        equity: "0.003",
        companyHandle: "c1",
        companyName: "C1"
      },
      {
        id: j2Id,
        title: "j2",
        salary: 200000,
        equity: "0.004",
        companyHandle: "c2",
        companyName: "C2"
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const { j1Id } = testJobIds;
    let job = await Job.get(j1Id);
    expect(job).toEqual({
      id: j1Id,
      title: "j1",
      salary: 100000,
      equity: "0.003",
      companyHandle: "c1",
      company: {
        name: "C1",
        numEmployees: 1,
        description: 'Desc1',
        logoUrl: 'http://c1.img'
      }
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(0);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "j4",
    salary: 100001,
    equity: "0.001"
  };

  test("works", async function () {
    const { j1Id } = testJobIds;
    let job = await Job.update(j1Id, updateData);
    expect(job).toEqual({
      id: j1Id,
      ...updateData,
    });

    const result = await db.query(
      `SELECT id, title, salary, equity
           FROM jobs
           WHERE id = $1`,
      [j1Id]
    );

    expect(result.rows).toEqual([
      {
        id: j1Id,
        title: "j4",
        salary: 100001,
        equity: "0.001"
      },
    ]);
  });

  test("works: missing optional fields", async function () {
    const { j1Id } = testJobIds;
    const updateDataSetNulls = {
      title: "j1",
      // FIXME: remove these 2 and make it work still
      salary: null,
      equity: null,
    };

    let job = await Job.update(j1Id, updateDataSetNulls);
    expect(job).toEqual({
      id: j1Id,
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT id, title, salary, equity
           FROM jobs
           WHERE id = $1`,
      [j1Id]
    );
    expect(result.rows).toEqual([
      {
        id: j1Id,
        title: "j1",
        salary: null,
        equity: null,
      },
    ]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(0, updateData);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    const { j1Id } = testJobIds;
    try {
      await Job.update(j1Id, {});
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    const { j1Id } = testJobIds;
    await Job.remove(j1Id);
    const res = await db.query(`SELECT id, title FROM jobs WHERE id= $1`, [
      j1Id,
    ]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(0);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** filters */

describe("formatWhereCmds - jobs", function () {
  test("works: returns valid object given all 3 filter parameters", function () {
    const results = Job.formatWhereCmds({
      title: "test",
      minSalary: 1,
      hasEquity: true,
    });

    expect(results).toEqual({
      sqlCmd: "WHERE title ILIKE $1 AND salary >= $2 AND equity > $3",
      values: ["%test%", 1, 0],
    });
  });

  test("works: returns valid object with minEquity set to false", function () {
    const results = Job.formatWhereCmds({
      title: "test",
      minSalary: 1,
      hasEquity: false,
    });

    expect(results).toEqual({
      sqlCmd: "WHERE title ILIKE $1 AND salary >= $2",
      values: ["%test%", 1],
    });
  });

  test("works: returns valid object with 1 filter parameter", function () {
    const results = Job.formatWhereCmds({
      minSalary: 1,
    });

    expect(results).toEqual({
      sqlCmd: "WHERE salary >= $1",
      values: [1],
    });
  });

  test("returns empty array for values and empty string for sqlCmds", function () {
    const results = Job.formatWhereCmds({});

    expect(results).toEqual({
      sqlCmd: null,
      values: null,
    });
  });
});
