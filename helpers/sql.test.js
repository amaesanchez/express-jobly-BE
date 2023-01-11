"use strict";

const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

const jsToSql = {
  numEmployees: "num_employees",
  logoUrl: "logo_url",
  firstName: "first_name",
  lastName: "last_name",
  isAdmin: "is_admin",
};

describe("sqlForPartialUpdate", function () {
  test("works: test valid update of all keys for company", function () {
    const dataToUpdate = {
      name: "testCo",
      description: "testy",
      numEmployees: 50,
      logoUrl: "testUrl",
    };
    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

    expect(result).toEqual({
      setCols: '"name"=$1, "description"=$2, "num_employees"=$3, "logo_url"=$4',
      values: ["testCo", "testy", 50, "testUrl"],
    });
  });

  test("works: test valid update of all keys for user", function () {
    const dataToUpdate = {
      firstName: "test",
      lastName: "testy",
      email: "test@gmail.com",
      isAdmin: "false",
    };

    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

    expect(result).toEqual({
      setCols: '"first_name"=$1, "last_name"=$2, "email"=$3, "is_admin"=$4',
      values: ["test", "testy", "test@gmail.com", "false"],
    });
  });

  test("doesn't work: test update of invalid data", function () {
    const dataToUpdate = {};

    try {
      sqlForPartialUpdate(dataToUpdate, jsToSql);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});
