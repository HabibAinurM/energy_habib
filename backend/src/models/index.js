//model index.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

// ─── USER ───────────────────────────────────────────────
const User = sequelize.define('User', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  email:    { type: DataTypes.STRING(100), allowNull: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING(10), defaultValue: 'user' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
    },
  },
});

User.prototype.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ─── DEVICE ───────────────────────────────────────────────
const Device = sequelize.define('Device', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deviceId: { type: DataTypes.STRING(100), allowNull: false, unique: true }, // mapped to device_id
  name:     { type: DataTypes.STRING(100), allowNull: false }, // mapped to nama_perangkat
  lokasi:   { type: DataTypes.STRING(100), allowNull: true },
  titikRumah: { type: DataTypes.STRING(100), allowNull: true }, // mapped to titik_rumah
  dayaTerpasang: { type: DataTypes.INTEGER, defaultValue: 1300 }, // mapped to daya_terpasang
  batasKwhHarian: { type: DataTypes.FLOAT, allowNull: true },
  batasKwhBulanan: { type: DataTypes.FLOAT, allowNull: true },
  keterangan: { type: DataTypes.TEXT, allowNull: true },
  status:   { type: DataTypes.STRING(20), defaultValue: 'nonaktif' },
}, {
  tableName: 'devices',
});

// ─── SENSOR DATA ────────────────────────────────────────
const SensorData = sequelize.define('SensorData', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tegangan:  { type: DataTypes.FLOAT, allowNull: false, comment: 'Voltage (V)' },
  arus:      { type: DataTypes.FLOAT, allowNull: false, comment: 'Current (A)' },
  daya:      { type: DataTypes.FLOAT, allowNull: false, comment: 'Power (W)' },
  energi:    { type: DataTypes.FLOAT, allowNull: false, comment: 'Energy (kWh)' },
  frekuensi: { type: DataTypes.FLOAT, allowNull: true, comment: 'Frequency (Hz)' },
  faktorDaya:{ type: DataTypes.FLOAT, allowNull: true, comment: 'Power Factor' },
  timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'sensor_data',
  indexes: [{ fields: ['timestamp'] }, { fields: ['deviceId'] }],
});

// ─── TARIF LISTRIK ──────────────────────────────────────
const TarifListrik = sequelize.define('TarifListrik', {
  id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  namaTarif:          { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Tarif Default' },
  hargaPerKwh:        { type: DataTypes.FLOAT, allowNull: false },
  batasBiayaBulanan:  { type: DataTypes.FLOAT, allowNull: true },
  isActive:           { type: DataTypes.BOOLEAN, defaultValue: true },
  updatedById:        { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'tarif_listrik',
});

// ─── ALERT ──────────────────────────────────────────────
const Alert = sequelize.define('Alert', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  alertType: { type: DataTypes.STRING(30), allowNull: false },
  severity:  { type: DataTypes.STRING(10), defaultValue: 'warning' },
  message:    { type: DataTypes.TEXT, allowNull: false },
  value:      { type: DataTypes.FLOAT, allowNull: true },
  threshold:  { type: DataTypes.FLOAT, allowNull: true },
  isRead:     { type: DataTypes.BOOLEAN, defaultValue: false },
  timestamp:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'alerts',
  indexes: [{ fields: ['timestamp'] }, { fields: ['isRead'] }],
});

// ─── ENERGI HARIAN ──────────────────────────────────────
const EnergiHarian = sequelize.define('EnergiHarian', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tanggal:      { type: DataTypes.DATEONLY, allowNull: false },
  totalEnergi:  { type: DataTypes.FLOAT, defaultValue: 0 },
  totalBiaya:   { type: DataTypes.FLOAT, defaultValue: 0 },
  avgTegangan:  { type: DataTypes.FLOAT, defaultValue: 0 },
  avgArus:      { type: DataTypes.FLOAT, defaultValue: 0 },
  avgDaya:      { type: DataTypes.FLOAT, defaultValue: 0 },
  maxDaya:      { type: DataTypes.FLOAT, defaultValue: 0 },
  dataCount:    { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'energi_harian',
  indexes: [
    { unique: true, fields: ['userId', 'tanggal'] }
  ],
});

// ─── PREDIKSI ENERGI ────────────────────────────────────
const PrediksiEnergi = sequelize.define('PrediksiEnergi', {
  id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tanggalPrediksi:  { type: DataTypes.DATEONLY, allowNull: false },
  prediksiEnergi:   { type: DataTypes.FLOAT, allowNull: false },
  prediksiBiaya:    { type: DataTypes.FLOAT, allowNull: false },
  confidenceLower:  { type: DataTypes.FLOAT, allowNull: true },
  confidenceUpper:  { type: DataTypes.FLOAT, allowNull: true },
  generatedAt:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'prediksi_energi',
  indexes: [{ fields: ['tanggalPrediksi'] }],
});

// ─── SYSTEM SETTINGS ────────────────────────────────────
const SystemSettings = sequelize.define('SystemSettings', {
  id:                    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  voltageMin:            { type: DataTypes.FLOAT, defaultValue: 190.0 },
  voltageMax:            { type: DataTypes.FLOAT, defaultValue: 250.0 },
  currentMax:            { type: DataTypes.FLOAT, defaultValue: 20.0 },
  costWarningPercentage: { type: DataTypes.FLOAT, defaultValue: 80.0 },
}, {
  tableName: 'system_settings',
});

// ─── RELATIONSHIPS ──────────────────────────────────────
User.hasMany(Device, { foreignKey: 'userId', as: 'devices' });
Device.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Device.hasMany(SensorData, { foreignKey: 'deviceId', as: 'sensorData' });
SensorData.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

User.hasOne(TarifListrik, { foreignKey: 'userId', as: 'tarif' });
TarifListrik.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Alert, { foreignKey: 'userId', as: 'alerts' });
Alert.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(EnergiHarian, { foreignKey: 'userId', as: 'energiHarian' });
EnergiHarian.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(SystemSettings, { foreignKey: 'userId', as: 'systemSettings' });
SystemSettings.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(PrediksiEnergi, { foreignKey: 'userId', as: 'prediksiEnergi' });
PrediksiEnergi.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Device, SensorData, TarifListrik, Alert, EnergiHarian, PrediksiEnergi, SystemSettings, sequelize };
