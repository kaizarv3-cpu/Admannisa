@echo off
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass %*

git add app.js index.html
git commit -m "perf: percepat muat spreadsheet 0.6s dan perbaiki direct photo drive berita"
git push origin main
