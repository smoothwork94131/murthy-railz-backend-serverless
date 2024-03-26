const express = require("express");
const app = express();
const http = require("http");
const sls = require('serverless-http')
const port = 4000;
const connection = require("./database/index").databaseConnection;
const moment = require("moment");
var cors = require("cors");

app.use(cors());

var getDaysArray = function (start, end) {
  for (
    var arr = [], dt = new Date(start);
    dt <= new Date(end);
    dt.setDate(dt.getDate() + 1)
  ) {
    arr.push(new Date(dt));
  }
  return arr;
};

const persentDays = (list, startMonth, currentMonth) => {
  const startDate = startMonth ? startMonth : moment().subtract(90, "days");
  const endDate = currentMonth ? currentMonth : moment();
  const dayList = getDaysArray(new Date(startDate), new Date(endDate));

  const datesPersent = dayList.filter(
    (day) =>
      !list.some(
        (item) =>
          moment(day).format("YYYY MM DD") ===
          moment(item.heartbeat).format("YYYY MM DD")
      )
  );
  const newResult = datesPersent.map((day) => {
    return {
      heartbeat: day,
    };
  });
  const newArr = newResult.concat(list);
  newArr.forEach((item) => {
    if (typeof item.heartbeat === "string") {
      item.heartbeat = new Date(item.heartbeat);
    }
  });
  return newArr.sort((a, b) => a.heartbeat - b.heartbeat);
};

app.get("/api/apps", (req, res) => {
  var sql = "SELECT DISTINCT grp FROM heartbeat;";
  connection.query(sql, (err, result) => {
    if (err) {
      res.status(500).send("Error occurred while fetching data");
      return;
    }
    res.json(result);
  });
});

app.get("/api/allApps", (req, res) => {
  var sql = "SELECT DISTINCT resource FROM heartbeat;";
  connection.query(sql, (err, result) => {
    if (err) {
      res.status(500).send("Error occurred while fetching data");
      return;
    }
    res.json(result);
  });
});

app.get("/api/platform/:platformId", (req, res) => {
  const platformId = req.params.platformId;
  var group_sql = `
  SELECT 
    h1.grp,
    h2.resource,
    h3.*
  FROM 
    (SELECT DISTINCT grp FROM heartbeat WHERE platform = '${platformId}') h1
  JOIN
    (SELECT DISTINCT grp, resource FROM heartbeat WHERE platform = '${platformId}') h2 ON h1.grp = h2.grp
  LEFT JOIN 
    heartbeat h3 ON h2.grp = h3.grp AND h2.resource = h3.resource
  WHERE 
    h3.platform = '${platformId}'
  ORDER BY 
    h1.grp ASC, h2.resource`;

  connection.query(group_sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error executing the query");
      return;
    }

    let grouped_result = {};
    let output = {};

    for (const row of results) {
      if (!grouped_result[row.grp]) {
        grouped_result[row.grp] = {};
      }

      if (!grouped_result[row.grp][row.resource]) {
        grouped_result[row.grp][row.resource] = [];
      }
      grouped_result[row.grp][row.resource].push(row);
    }

    for (const group_level_key in grouped_result) {
      if (!output[group_level_key]) {
        output[group_level_key] = {};
      }

      for (const resource_level_key in grouped_result[group_level_key]) {
        if (!output[group_level_key][resource_level_key]) {
          output[group_level_key][resource_level_key] = [];
        }

        const arrayOfObjects =
          grouped_result[group_level_key][resource_level_key];
        const resultbydate = persentDays(arrayOfObjects);
        // console.log("--------------");
        // console.log(arrayOfObjects);
        // console.log("---------------");
        output[group_level_key][resource_level_key] = resultbydate;
      }
    }

    res.json(output);
  });
});

app.get("/api/uptime", (req, res) => {
  var sql = `SELECT * FROM heartbeat WHERE resource = ? AND DATE(heartbeat) BETWEEN '${req.query.startingDate}' AND '${req.query.lastDate}' ORDER BY heartbeat ASC`;
  connection.query(sql, [req.query.appName], (err, result) => {
    const rdsList = persentDays(
      result,
      req.query.startingDate,
      req.query.lastDate
    );
    if (err) throw err;
    res.json(rdsList);
  });
});

const server = http.createServer(app);
server.timeout = 36000000;

module.exports = {
  dev: () => {
      server.listen(port, () => {
          console.log(`Server listening on port ${port}`);
      });
  },
  start: sls(app)
};
