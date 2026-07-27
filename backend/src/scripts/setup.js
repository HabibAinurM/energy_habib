require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function setup() {
  console.log('\n=== Energy Monitor - Setup Database (MySQL) ===\n');

  const sequelize = require('../config/database');

  // Cek koneksi
  console.log('[0/5] Mengecek koneksi ke MySQL...');
  try {
    await sequelize.authenticate();
    console.log('       Koneksi MySQL berhasil!\n');
  } catch (err) {
    console.error('       Gagal koneksi! Pastikan XAMPP MySQL sudah START');
    console.error('      Error:', err.message);
    process.exit(1);
  }

  const { User, TarifListrik, MasterTarif, SystemSettings } = require('../models');

  // Buat tabel
  console.log('[1/5] Membuat semua tabel...');
  await sequelize.sync({ alter: true });
  console.log('      ✓ Tabel berhasil dibuat\n');

  // Admin
  console.log('[2/5] Membuat akun admin...');
  const [admin, createdAdmin] = await User.findOrCreate({
    where: { username: 'admin' },
    defaults: { email: 'admin@energy.local', password: 'admin123', role: 'admin' },
  });
  console.log(createdAdmin ? '      ✓ Admin dibuat' : '      ℹ Admin sudah ada');

  // User
  console.log('\n[3/5] Membuat akun user...');
  const [, createdUser] = await User.findOrCreate({
    where: { username: 'user' },
    defaults: { email: 'user@energy.local', password: 'user123', role: 'user' },
  });
  console.log(createdUser ? '      ✓ User dibuat' : '      ℹ User sudah ada');

  // Tarif
  console.log('\n[4/5] Membuat tarif default...');
  await TarifListrik.findOrCreate({
    where: { namaTarif: 'R-1/TR 1300VA' },
    defaults: { hargaPerKwh: 1444.70, batasBiayaBulanan: 500000, isActive: true, updatedById: admin.id },
  });
  console.log('      ✓ Tarif dibuat');

  // Settings
  console.log('\n[5/6] System settings...');
  await SystemSettings.findOrCreate({
    where: { id: 1 },
    defaults: { voltageMin: 190, voltageMax: 250, currentMax: 20, costWarningPercentage: 80 },
  });
  console.log('      ✓ Settings siap');

  // Master Tarif
  console.log('\n[6/6] Membuat Master Tarif referensi...');
  const golongans = [
    { namaGolongan: 'R-1/TR 900VA', tarifPerKwh: 1352 },
    { namaGolongan: 'R-1/TR 1300VA', tarifPerKwh: 1444.70 },
    { namaGolongan: 'R-1/TR 2200VA', tarifPerKwh: 1444.70 },
    { namaGolongan: 'R-2/TR 3500-5500VA', tarifPerKwh: 1699.53 },
    { namaGolongan: 'R-3/TR ≥6600VA', tarifPerKwh: 1699.53 },
  ];
  for (const gol of golongans) {
    await MasterTarif.findOrCreate({
      where: { namaGolongan: gol.namaGolongan },
      defaults: { tarifPerKwh: gol.tarifPerKwh },
    });
  }
  console.log('      ✓ Master Tarif dibuat');

  console.log('\n Setup selesai! Jalankan: npm run dev\n');
  process.exit(0);
}

setup().catch((err) => {
  console.error('\nSetup gagal:', err.message);
  process.exit(1);
});