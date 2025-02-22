# 🪟 Comandos Git - Windows (Simplificado)

# 1. Verificar se há alterações remotas (opcional)
git fetch

# 2. Ver diferenças entre local e remoto (opcional)
git status

# 3. Puxar e aplicar alterações da nuvem
git pull origin main

# 4. Em caso de conflitos, resolver e depois:
git add .
git commit -m "Fix: resolução de conflitos"
git push origin main

# 4. Enviar para nuvem
git push origin main

git stash
git pull origin main
git stash pop