@echo off
git init
git remote add origin https://github.com/evoneuralai-admin/in3devoneuralwebsite.git
git add .
git commit -m "feat: complete rebranding and firebase configuration updates"
git branch -M main
git push -u origin main
echo success > success.txt
