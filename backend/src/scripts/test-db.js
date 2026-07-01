require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { EnergiHarian, SensorData, User } = require('../models');

async function test() {
  const users = await User.findAll();
  console.log("Users:", users.map(u => u.id));
  
  const harian = await EnergiHarian.findAll({
    order: [['tanggal', 'DESC']],
    limit: 5
  });
  console.log("Recent EnergiHarian:");
  harian.forEach(h => {
    console.log(`- User: ${h.userId}, Tanggal: ${h.tanggal}, maxDaya: ${h.maxDaya}`);
  });
  
  process.exit(0);
}

test().catch(console.error);
