"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies(
          handle,
          name,
          description,
          num_employees,
          logo_url)
           VALUES
             ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies. Can be provided optional filtering parameters
   * (nameLike, minEmployees, maxEmployees).
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(filters) {
    if (filters?.minEmployees > filters?.maxEmployees)
      throw new BadRequestError();
    const { sqlCmd, values } = this.formatWhereCmds(filters);

    const querySql = `
    SELECT handle,
          name,
          description,
          num_employees AS "numEmployees",
          logo_url AS "logoUrl"
    FROM companies
    ${sqlCmd ? sqlCmd : ""}
    ORDER BY name
    `;

    const companiesRes = await db.query(querySql, values);

    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
              name,
              description,
              num_employees AS "numEmployees",
              logo_url AS "logoUrl"
      FROM companies
      WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobRes = await db.query(
      `Select id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
      FROM jobs
      WHERE company_handle = $1`,
      [handle]
    );

    const jobs = jobRes.rows;

    company.jobs = jobs;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE companies
      SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }

  /** Given an object with optional filters as keys:
   *    nameLike, minEmployees, maxEmployees
   *
   *  Returns an object with keys:
   *    sqlCmd: str with parameterized sql query
   *    values: arr with values of filters passed in
   *
   *  - ex: {nameLike: 'and', minEmployees: 400, maxEmployees: 800} => {
   *    sqlCmd: "name ILIKE $1 AND num_employees <= $2, AND num_employees >= $3"
   *    values: ['%and%', 400, 800]
   *    }
   * */

  static formatWhereCmds(filters) {
    if (Object.keys(filters).length === 0)
      return {
        sqlCmd: null,
        values: null,
      };

    const conditions = [];
    const values = [];
    for (const filter in filters) {
      const value = filters[filter];

      if (filter === "nameLike") {
        conditions.push(`name ILIKE $${conditions.length + 1}`);
        values.push(`%${value}%`);
      } else if (filter === "minEmployees") {
        conditions.push(`num_employees >= $${conditions.length + 1}`);
        values.push(value);
      } else {
        // if (filter === "maxEmployees")
        conditions.push(`num_employees <= $${conditions.length + 1}`);
        values.push(value);
      }
    }

    const sqlCmd = "WHERE " + conditions.join(" AND ");

    return {
      sqlCmd,
      values,
    };
  }
}

module.exports = Company;
