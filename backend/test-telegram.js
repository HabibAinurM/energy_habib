require('dotenv').config();
const axios = require('axios');
const { User } = require('./src/models');

async function runTest() {
  console.log('--- TEST TELEGRAM BOT ---');
  const token = process.env.TELEGRAM_BOT_TOKEN;
  console.log('Token:', token ? 'Terdeteksi' : 'TIDAK ADA');

  if (!token) {
    console.error('Error: TELEGRAM_BOT_TOKEN tidak ditemukan di file .env');
    process.exit(1);
  }

  try {
    // Cari user yang memiliki telegramChatId
    const user = await User.findOne({ where: { role: 'user' }, order: [['id', 'ASC']] });
    
    if (!user) {
      console.error('Error: Tidak ada User di database.');
      process.exit(1);
    }
    
    console.log(`User ditemukan: ${user.username} (ID: ${user.id})`);
    
    if (!user.telegramChatId) {
      console.error(`Error: User ${user.username} belum mengatur telegramChatId di database.`);
      process.exit(1);
    }

    console.log(`Telegram Chat ID: ${user.telegramChatId}`);
    console.log('Mencoba mengirim pesan...');

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: user.telegramChatId,
      text: '🤖 *TES BOT ENERGI METER*\n\nJika Anda melihat pesan ini, berarti Bot Telegram Anda sudah terhubung dan berfungsi dengan baik!',
      parse_mode: 'Markdown'
    });

    console.log('✅ Pesan berhasil terkirim!');
    console.log('Detail response:', response.data.result.text);

  } catch (error) {
    console.error('❌ Gagal mengirim pesan!');
    if (error.response) {
      console.error('Detail Error dari Telegram:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
  
  process.exit(0);
}

runTest();
