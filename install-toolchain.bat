@echo off
title Vowen Clone - Instalar Build Tools (C++ + CMake)

rem --- Auto-elevar a administrador si hace falta ---
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Pidiendo permisos de administrador (acepta la ventana de Windows)...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo ============================================================
echo  1/2  Visual Studio C++ Build Tools  (10-20 min aprox.)
echo  No cierres esta ventana. Aunque parezca parado, esta trabajando.
echo ============================================================
"%~dp0_vowen_analysis\toolchain\vs_BuildTools.exe" --quiet --wait --norestart --nocache --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.VC.CMake.Project --includeRecommended
echo  -> Build Tools terminado (codigo %errorlevel%).

echo.
echo ============================================================
echo  2/2  CMake
echo ============================================================
msiexec /i "%~dp0_vowen_analysis\toolchain\cmake-installer.msi" ADD_CMAKE_TO_PATH=System /qb /norestart
echo  -> CMake terminado.

echo.
echo ============================================================
echo  LISTO. Cierra esta ventana y avisame ("ya esta").
echo ============================================================
pause
