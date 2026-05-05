@echo off
echo ============================================
echo  Energy Monitor - Setup Frontend React
echo ============================================
echo.

cd frontend

echo [1/2] Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install gagal.
    pause
    exit /b 1
)

echo.
echo [2/2] Menjalankan React development server...
echo.
echo ============================================
echo  Frontend berjalan di: http://localhost:3000
echo ============================================
echo.
npm start
