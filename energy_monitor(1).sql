-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db
-- Waktu pembuatan: 03 Jul 2026 pada 14.48
-- Versi server: 8.0.46
-- Versi PHP: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Basis data: `energy_monitor`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `alerts`
--

CREATE TABLE `alerts` (
  `id` int NOT NULL,
  `alertType` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `severity` varchar(10) COLLATE utf8mb4_general_ci DEFAULT 'warning',
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `value` float DEFAULT NULL,
  `threshold` float DEFAULT NULL,
  `isRead` tinyint(1) DEFAULT '0',
  `timestamp` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `devices`
--

CREATE TABLE `devices` (
  `id` int NOT NULL,
  `deviceId` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `lokasi` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `titikRumah` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `dayaTerpasang` int DEFAULT '1300',
  `batasKwhHarian` float DEFAULT NULL,
  `batasKwhBulanan` float DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_general_ci,
  `status` varchar(20) COLLATE utf8mb4_general_ci DEFAULT 'nonaktif',
  `targetWifiSsid` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `targetWifiPassword` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `devices`
--

INSERT INTO `devices` (`id`, `deviceId`, `name`, `lokasi`, `titikRumah`, `dayaTerpasang`, `batasKwhHarian`, `batasKwhBulanan`, `keterangan`, `status`, `targetWifiSsid`, `targetWifiPassword`, `createdAt`, `updatedAt`, `userId`) VALUES
(1, 'D1', 'Virtual Device', '', 'mn', 1300, NULL, NULL, '', 'aktif', NULL, NULL, '2026-06-29 06:12:36', '2026-06-30 14:08:27', 2);

-- --------------------------------------------------------

--
-- Struktur dari tabel `energi_harian`
--

CREATE TABLE `energi_harian` (
  `id` int NOT NULL,
  `tanggal` date NOT NULL,
  `totalEnergi` float DEFAULT '0',
  `totalBiaya` float DEFAULT '0',
  `avgTegangan` float DEFAULT '0',
  `avgArus` float DEFAULT '0',
  `avgDaya` float DEFAULT '0',
  `maxDaya` float DEFAULT '0',
  `dataCount` int DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `energi_harian`
--

INSERT INTO `energi_harian` (`id`, `tanggal`, `totalEnergi`, `totalBiaya`, `avgTegangan`, `avgArus`, `avgDaya`, `maxDaya`, `dataCount`, `createdAt`, `updatedAt`, `userId`) VALUES
(1, '2026-06-30', 0.042, 56.78, 228.09, 0.2627, 33.37, 38.91, 5, '2026-06-30 15:40:50', '2026-06-30 16:40:52', 2),
(6, '2026-07-01', 0.026, 35.15, 226.5, 0.3072, 36.45, 40, 3, '2026-07-01 03:59:17', '2026-07-01 04:29:11', 2);

-- --------------------------------------------------------

--
-- Struktur dari tabel `prediksi_energi`
--

CREATE TABLE `prediksi_energi` (
  `id` int NOT NULL,
  `tanggalPrediksi` date NOT NULL,
  `prediksiEnergi` float NOT NULL,
  `prediksiBiaya` float NOT NULL,
  `confidenceLower` float DEFAULT NULL,
  `confidenceUpper` float DEFAULT NULL,
  `generatedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `sensor_data`
--

CREATE TABLE `sensor_data` (
  `id` int NOT NULL,
  `tegangan` float NOT NULL COMMENT 'Voltage (V)',
  `arus` float NOT NULL COMMENT 'Current (A)',
  `daya` float NOT NULL COMMENT 'Power (W)',
  `energi` float NOT NULL COMMENT 'Energy (kWh)',
  `frekuensi` float DEFAULT NULL COMMENT 'Frequency (Hz)',
  `faktorDaya` float DEFAULT NULL COMMENT 'Power Factor',
  `timestamp` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deviceId` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `sensor_data`
--

INSERT INTO `sensor_data` (`id`, `tegangan`, `arus`, `daya`, `energi`, `frekuensi`, `faktorDaya`, `timestamp`, `createdAt`, `updatedAt`, `deviceId`) VALUES
(1, 226.799, 0.301678, 38.9078, 0.010002, 49.9495, 0.567833, '2026-06-30 15:40:49', '2026-06-30 15:40:49', '2026-06-30 15:40:49', 1),
(2, 227.206, 0.271267, 34.3844, 0.007996, 49.9794, 0.557111, '2026-06-30 15:55:49', '2026-06-30 15:55:49', '2026-06-30 15:55:49', 1),
(3, 228.234, 0.258211, 32.7855, 0.008003, 49.9772, 0.555834, '2026-06-30 16:10:50', '2026-06-30 16:10:50', '2026-06-30 16:10:50', 1),
(4, 229.005, 0.24633, 31.1704, 0.007996, 49.9888, 0.552235, '2026-06-30 16:25:52', '2026-06-30 16:25:52', '2026-06-30 16:25:52', 1),
(5, 229.195, 0.236222, 29.6261, 0.008003, 49.9972, 0.546612, '2026-06-30 16:40:51', '2026-06-30 16:40:52', '2026-06-30 16:40:52', 1),
(6, 229.822, 0.210905, 25.6536, 0.006996, 49.9458, 0.528491, '2026-06-30 17:28:13', '2026-06-30 17:28:13', '2026-06-30 17:28:13', 1),
(7, 230.443, 0.198856, 24.0917, 0.006004, 49.895, 0.525166, '2026-06-30 17:43:13', '2026-06-30 17:43:13', '2026-06-30 17:43:13', 1),
(8, 226.727, 0.333624, 40, 0.008995, 49.9764, 0.522921, '2026-07-01 03:57:19', '2026-07-01 03:57:20', '2026-07-01 03:57:20', 1),
(9, 225.615, 0.304067, 36.0084, 0.009003, 49.9642, 0.523575, '2026-07-01 04:14:09', '2026-07-01 04:14:09', '2026-07-01 04:14:09', 1),
(10, 227.163, 0.283838, 33.3492, 0.008003, 49.9268, 0.516704, '2026-07-01 04:29:10', '2026-07-01 04:29:11', '2026-07-01 04:29:11', 1);

-- --------------------------------------------------------

--
-- Struktur dari tabel `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int NOT NULL,
  `voltageMin` float DEFAULT '190',
  `voltageMax` float DEFAULT '250',
  `currentMax` float DEFAULT '20',
  `costWarningPercentage` float DEFAULT '80',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `system_settings`
--

INSERT INTO `system_settings` (`id`, `voltageMin`, `voltageMax`, `currentMax`, `costWarningPercentage`, `createdAt`, `updatedAt`, `userId`) VALUES
(1, 190, 250, 20, 80, '2026-06-29 06:11:55', '2026-06-29 06:11:55', NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `tarif_listrik`
--

CREATE TABLE `tarif_listrik` (
  `id` int NOT NULL,
  `namaTarif` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Tarif Default',
  `hargaPerKwh` float NOT NULL,
  `batasBiayaBulanan` float DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `updatedById` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tarif_listrik`
--

INSERT INTO `tarif_listrik` (`id`, `namaTarif`, `hargaPerKwh`, `batasBiayaBulanan`, `isActive`, `updatedById`, `createdAt`, `updatedAt`, `userId`) VALUES
(1, 'R-1/TR 1300VA', 1444.7, 500000, 1, 1, '2026-06-29 06:11:55', '2026-06-29 06:11:55', NULL),
(2, 'R-1/TR 900VA', 1352, 500000, 1, 2, '2026-06-29 06:12:32', '2026-06-29 06:12:32', 2);

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` varchar(10) COLLATE utf8mb4_general_ci DEFAULT 'user',
  `isActive` tinyint(1) DEFAULT '1',
  `telegramChatId` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `isActive`, `telegramChatId`, `createdAt`, `updatedAt`) VALUES
(1, 'admin', 'admin@energy.local', '$2a$12$hUaeKE2ujvwH02K1cgVfJe.sDurBtDz4PhM/HceJxxAPkgR0qDi9W', 'admin', 1, NULL, '2026-06-29 06:11:54', '2026-06-29 06:11:54'),
(2, 'user', 'user@energy.local', '$2a$12$ba0DDoHAVo/AsJWNaafkWu8OkV0iPt1VJXVCD3QqPdkf1nr5HbyWi', 'user', 1, '1447910183', '2026-06-29 06:11:55', '2026-07-01 03:19:11');

--
-- Indeks untuk tabel yang dibuang
--

--
-- Indeks untuk tabel `alerts`
--
ALTER TABLE `alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alerts_timestamp` (`timestamp`),
  ADD KEY `alerts_is_read` (`isRead`),
  ADD KEY `userId` (`userId`);

--
-- Indeks untuk tabel `devices`
--
ALTER TABLE `devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `deviceId` (`deviceId`),
  ADD UNIQUE KEY `deviceId_2` (`deviceId`),
  ADD UNIQUE KEY `deviceId_3` (`deviceId`),
  ADD UNIQUE KEY `deviceId_4` (`deviceId`),
  ADD UNIQUE KEY `deviceId_5` (`deviceId`),
  ADD UNIQUE KEY `deviceId_6` (`deviceId`),
  ADD UNIQUE KEY `deviceId_7` (`deviceId`),
  ADD UNIQUE KEY `deviceId_8` (`deviceId`),
  ADD UNIQUE KEY `deviceId_9` (`deviceId`),
  ADD UNIQUE KEY `deviceId_10` (`deviceId`),
  ADD UNIQUE KEY `deviceId_11` (`deviceId`),
  ADD UNIQUE KEY `deviceId_12` (`deviceId`),
  ADD UNIQUE KEY `deviceId_13` (`deviceId`),
  ADD UNIQUE KEY `deviceId_14` (`deviceId`),
  ADD UNIQUE KEY `deviceId_15` (`deviceId`),
  ADD KEY `userId` (`userId`);

--
-- Indeks untuk tabel `energi_harian`
--
ALTER TABLE `energi_harian`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `energi_harian_user_id_tanggal` (`userId`,`tanggal`);

--
-- Indeks untuk tabel `prediksi_energi`
--
ALTER TABLE `prediksi_energi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prediksi_energi_tanggal_prediksi` (`tanggalPrediksi`),
  ADD KEY `userId` (`userId`);

--
-- Indeks untuk tabel `sensor_data`
--
ALTER TABLE `sensor_data`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sensor_data_timestamp` (`timestamp`),
  ADD KEY `sensor_data_device_id` (`deviceId`);

--
-- Indeks untuk tabel `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indeks untuk tabel `tarif_listrik`
--
ALTER TABLE `tarif_listrik`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `username_2` (`username`),
  ADD UNIQUE KEY `username_3` (`username`),
  ADD UNIQUE KEY `username_4` (`username`),
  ADD UNIQUE KEY `username_5` (`username`),
  ADD UNIQUE KEY `username_6` (`username`),
  ADD UNIQUE KEY `username_7` (`username`),
  ADD UNIQUE KEY `username_8` (`username`),
  ADD UNIQUE KEY `username_9` (`username`),
  ADD UNIQUE KEY `username_10` (`username`),
  ADD UNIQUE KEY `username_11` (`username`),
  ADD UNIQUE KEY `username_12` (`username`),
  ADD UNIQUE KEY `username_13` (`username`),
  ADD UNIQUE KEY `username_14` (`username`),
  ADD UNIQUE KEY `username_15` (`username`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `alerts`
--
ALTER TABLE `alerts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `devices`
--
ALTER TABLE `devices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `energi_harian`
--
ALTER TABLE `energi_harian`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `prediksi_energi`
--
ALTER TABLE `prediksi_energi`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `sensor_data`
--
ALTER TABLE `sensor_data`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT untuk tabel `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `tarif_listrik`
--
ALTER TABLE `tarif_listrik`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `alerts`
--
ALTER TABLE `alerts`
  ADD CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `devices`
--
ALTER TABLE `devices`
  ADD CONSTRAINT `devices_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `energi_harian`
--
ALTER TABLE `energi_harian`
  ADD CONSTRAINT `energi_harian_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `prediksi_energi`
--
ALTER TABLE `prediksi_energi`
  ADD CONSTRAINT `prediksi_energi_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `sensor_data`
--
ALTER TABLE `sensor_data`
  ADD CONSTRAINT `sensor_data_ibfk_1` FOREIGN KEY (`deviceId`) REFERENCES `devices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `tarif_listrik`
--
ALTER TABLE `tarif_listrik`
  ADD CONSTRAINT `tarif_listrik_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
