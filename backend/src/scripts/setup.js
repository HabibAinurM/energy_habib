require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function setup() {
  console.log('\n=== Energy Monitor - Setup Database (MySQL) ===\n');

  const sequelize = require('../config/database');

  // Cek koneksi
  console.log('[0/5] Mengecek koneksi ke MySQL...');
  try {
    await sequelize.authenticate();
    console.log('      ✓ Koneksi MySQL berhasil!\n');
  } catch (err) {
    console.error('      ✗ Gagal koneksi! Pastikan XAMPP MySQL sudah START');
    console.error('      Error:', err.message);
    process.exit(1);
  }

  const { User, TarifListrik, SystemSettings } = require('../models');

  // Buat tabel
  console.log('[1/5] Membuat semua tabel...');
  await sequelize.sync({ force: false });
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
  console.log('\n[5/5] System settings...');
  await SystemSettings.findOrCreate({
    where: { id: 1 },
    defaults: { voltageMin: 190, voltageMax: 250, currentMax: 20, costWarningPercentage: 80 },
  });
  console.log('      ✓ Settings siap');

  console.log('\n✅ Setup selesai! Jalankan: npm run dev\n');
  process.exit(0);
}

setup().catch((err) => {
  console.error('\nSetup gagal:', err.message);
  process.exit(1);
});