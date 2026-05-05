@echo off
echo ============================================
echo  Energy Monitor (Node.js) - Setup Backend
echo ============================================
echo.

cd backend

echo [1/3] Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install gagal. Pastikan Node.js sudah terinstall.
    pause
    exit /b 1
)

echo.
echo [2/3] Menginisialisasi database dan membuat akun default...
node src/scripts/setup.js
if %errorlevel% neq 0 (
    echo ERROR: Setup database gagal.
    pause
    exit /b 1
)

echo.
echo [3/3] Menjalankan server backend...
echo.
echo ============================================
echo  Backend berjalan di: http://localhost:8000
echo  API Docs: http://localhost:8000/health
echo  Login: admin / admin123
echo ============================================
echo.
npm run dev
