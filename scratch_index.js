const { Parser } = require('@dbml/core');
const fs = require('fs');
const util = require('util');

const dbml = `
Table users {
  id integer [primary key]
  username varchar
  created_at timestamp
  
  Indexes {
    username [name: 'idx_username']
    (id, username)
  }
}
`;

const parsed = Parser.parse(dbml, 'dbml');
console.log(util.inspect(parsed.schemas[0].tables[0].indexes, { depth: 3 }));
