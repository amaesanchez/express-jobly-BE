const { BadRequestError } = require("../expressError");

/** Given JSON with data to update a record, and an object used to
 * convert camelCase to snake_case
 *
 *  - grabs the keys of the JSON data and maps the keys to an array with
 *    their index (one-indexed)
 *    - key names are converted to snake_case via jsToSql object if needed
 *
 *  - Returns an object with setCols and values keys, which represent the joined
 *    keys array (cols) as a string separated by commas,
 *    and the values from the JSON data to update, respectively
 *
 *  - ex. {firstName: 'Aliya', age: 32} => {
 *    setCols: '"first_name"=$1, "age"=$2',
 *    values: ["Aliya", 32]
 *    }
 * */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

/** Given an object with optional keys labeled nameLike,
 * minEmployees, and/or maxEmployees
 *
 *  - throws BadRequestError if minEmployees is greater than maxEmployees
 *  - creates an array of WHERE conditions
 *  - Returns string of array joined by " AND "
 * */
function formatWhereCmds(filters) {
  const conditions = [];
  const values = [];
  for (const filter in filters) {
    const value = filters[filter];

    if (value) {
      if (filter === "nameLike") {
        conditions.push(`name ILIKE $${conditions.length + 1}`);
        values.push(`%${value}%`);
      } else if (filter === "minEmployees") {
        conditions.push(`num_employees >= $${conditions.length + 1}`);
        values.push(value);
      } else if (filter === "maxEmployees") {
        conditions.push(`num_employees <= $${conditions.length + 1}`);
        values.push(value);
      }
    }
  }

  const sqlCmd = conditions.join(" AND ");

  return {
    sqlCmd, // "name ILIKE $1 AND num_employees <= $2, AND num_employees >= $3"
    values, // ['%and'%, 400, 800]
  };
}

module.exports = {
  sqlForPartialUpdate,
  formatWhereCmds,
};
