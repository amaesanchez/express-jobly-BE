"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError } = require("../expressError");

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
      `INSERT INTO jobs(
          title,
          salary,
          equity,
          company_handle)
           VALUES
             ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs. Can be provided optional filtering parameters
   * (title, minSalary, hasEquity).
   *
   * Returns [{ id, title, salary, equity, company_handle, companyName }, ...]
   * */
  // FIXME: send back the company name too
  static async findAll(filters) {
    const { sqlCmd, values } = this.formatWhereCmds(filters);

    const querySql = `
        SELECT id,
              title,
              salary,
              equity,
              company_handle AS "companyHandle"
        FROM jobs
        ${sqlCmd ? sqlCmd : ""}
        ORDER BY title
    `;

    const jobsRes = await db.query(querySql, values);

    return jobsRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, company_handle, {company} }
   *
   * Throws NotFoundError if not found.
   **/
  // FIXME: add the company object but remove the company_handle key inside of it
  static async get(id) {
    const jobRes = await db.query(
      `SELECT id,
                title,
                salary,
                equity,
                company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job found at id: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity, FIXME: companyHandle}
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idVarIdx = "$" + (values.length + 1);
    const querySql = `
      UPDATE jobs
      SET ${setCols}
        WHERE id = ${idVarIdx}
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job found at id: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job found at id: ${id}`);
  }

  /** Given an object with optional filters as keys:
   *    title, minSalary, hasEquity
   *
   *  Returns an object with keys:
   *    sqlCmd: str with parameterized sql query
   *    values: arr with values of filters passed in
   *
   *  - ex: {title: 'j', minSalary: 1, hasEquity: true} => {
   *    sqlCmd: "title ILIKE $1 AND salary >= $2, AND equity > $3"
   *    values: ['%j%', 1, 0]
   *    }
   * */

  static formatWhereCmds(filters) {
    if (
      Object.keys(filters).length === 1 &&
      Object.keys(filters).includes("hasEquity") &&
      filters.hasEquity !== true
    )
      return {
        sqlCmd: null,
        values: null,
      };

    const conditions = [];
    const values = [];
    // FIXME: don't need the for loop
    for (const filter in filters) {
      const value = filters[filter];

      if (filter === "title") {
        conditions.push(`title ILIKE $${conditions.length + 1}`);
        values.push(`%${value}%`);
      } else if (filter === "minSalary") {
        conditions.push(`salary >= $${conditions.length + 1}`);
        values.push(value);
      } else {
        if (value === true) {
          conditions.push(`equity > $${conditions.length + 1}`);
          values.push(0);
        }
      }
    }

    const sqlCmd = "WHERE " + conditions.join(" AND ");

    return {
      sqlCmd,
      values,
    };
  }
}

module.exports = Job;
