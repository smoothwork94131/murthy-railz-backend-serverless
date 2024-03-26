const mysql = require("mysql2");
const connection = mysql
  .createConnection({
    host: "railz.cfy68ayiubev.eu-central-1.rds.amazonaws.com",
    user: "admin",
    password: "abcde12345",
    database: "railz",
  })
  connection.connect((err => {
    if(err) throw err;
    console.log("Database Connected");
}));
 
// 3.
exports.databaseConnection = connection;
