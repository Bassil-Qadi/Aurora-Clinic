const fs = require('fs');
const line = fs.readFileSync('.env.local','utf8').split(/\r?\n/).find(l=>l.startsWith('MONGODB_URI='));
const uri = line.slice('MONGODB_URI='.length).trim().replace(/^["']|["']$/g,'');
const mongoose = require('mongoose');
const start = Date.now();
mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 })
  .then(async () => {
    console.log('CONNECTED ok in', Date.now()-start, 'ms');
    const dbs = await mongoose.connection.db.admin().listDatabases();
    console.log('dbs:', dbs.databases.map(d=>d.name).join(', '));
    process.exit(0);
  })
  .catch(e => {
    console.log('FAILED after', Date.now()-start, 'ms');
    console.log('name:', e.name);
    console.log('message:', String(e.message).slice(0,1200));
    process.exit(1);
  });
