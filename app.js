const server = require("./src/server");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, `./.env`),
});

module.exports.server = server.start;
server.dev();
