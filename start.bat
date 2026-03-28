@echo off
echo ========================================
echo   PrajaVaani - AI Voice Bot v6.0
echo ========================================
echo.

REM Load environment variables from .env file
if exist .env (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if not "%%A"=="" if not "%%A:~0,1%"=="#" (
            set "%%A=%%B"
        )
    )
    echo Environment loaded from .env ✓
) else (
    echo [Warning] .env file not found. Gemini AI may not work.
)

echo.
echo Installing/checking Python dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting Python backend on http://localhost:8000 ...
start "PrajaVaani Python Backend" cmd /k "python app.py"

echo.
echo Waiting for Python server to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Starting Node.js server (npm run server)...
start "PrajaVaani Node Server" cmd /k "npm run server"

echo.
echo ========================================
echo   Both servers are starting!
echo   Python backend : http://localhost:8000
echo   Open your browser at: http://localhost:8000
echo ========================================
echo.
echo Press any key to close this launcher window.
pause
