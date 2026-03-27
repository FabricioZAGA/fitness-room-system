#!/usr/bin/env bash
# =============================================================================
# setup.sh — Fitness Room System — Full Project Bootstrap
#
# Uso:   bash setup.sh
# Opcs:  bash setup.sh --backend-only
#        bash setup.sh --frontend-only
#        bash setup.sh --infra-only
#        bash setup.sh --check       (solo verifica herramientas, no instala)
#
# Qué hace:
#   1. Verifica herramientas requeridas (pyenv/uv, nvm/fnm, pnpm, direnv, AWS CLI, CDK)
#   2. Instala Python 3.12 (si pyenv está disponible)
#   3. Crea el virtualenv del backend con uv y lo pobla
#   4. Crea el virtualenv del CDK con pip
#   5. Instala dependencias del frontend con pnpm
#   6. Copia .env.example → .env si no existen
#   7. Registra el .envrc con direnv (direnv allow)
#   8. Imprime resumen y próximos pasos
# =============================================================================

set -euo pipefail

# ─── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Argumentos ───────────────────────────────────────────────────────────────
BACKEND_ONLY=false
FRONTEND_ONLY=false
INFRA_ONLY=false
CHECK_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --backend-only)  BACKEND_ONLY=true ;;
    --frontend-only) FRONTEND_ONLY=true ;;
    --infra-only)    INFRA_ONLY=true ;;
    --check)         CHECK_ONLY=true ;;
    *) echo -e "${RED}Argumento desconocido: $arg${RESET}"; exit 1 ;;
  esac
done

# Sin flags → instalar todo
if ! $BACKEND_ONLY && ! $FRONTEND_ONLY && ! $INFRA_ONLY; then
  BACKEND_ONLY=true; FRONTEND_ONLY=true; INFRA_ONLY=true
fi

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}${BOLD}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}${BOLD}[ OK ]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}${BOLD}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}${BOLD}[ERR ]${RESET}  $*" >&2; }

check_tool() {
  local tool="$1"
  local install_hint="${2:-}"
  if command -v "$tool" &>/dev/null; then
    success "$tool $(${tool} --version 2>&1 | head -1)"
    return 0
  else
    warn "$tool no encontrado${install_hint:+ — instala con: $install_hint}"
    return 1
  fi
}

require_tool() {
  local tool="$1"
  local install_hint="${2:-}"
  if ! command -v "$tool" &>/dev/null; then
    error "Herramienta requerida no encontrada: $tool"
    [ -n "$install_hint" ] && echo "  → $install_hint"
    exit 1
  fi
}

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Fitness Room System — Project Bootstrap    ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ─── 1. Verificar herramientas ────────────────────────────────────────────────
info "Verificando herramientas del sistema..."
echo ""

MISSING=0

check_tool "git"                              "brew install git"             || MISSING=$((MISSING+1))
check_tool "uv"                               "curl -LsSf https://astral.sh/uv/install.sh | sh" || MISSING=$((MISSING+1))
check_tool "aws"                              "brew install awscli"          || MISSING=$((MISSING+1))
check_tool "direnv"                           "brew install direnv"          || MISSING=$((MISSING+1))

# Node: fnm preferred, nvm fallback
if command -v fnm &>/dev/null; then
  success "fnm $(fnm --version)"
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
  success "nvm (encontrado en ~/.nvm)"
else
  warn "fnm / nvm no encontrado — instala: brew install fnm"
  MISSING=$((MISSING+1))
fi

if command -v pnpm &>/dev/null; then
  success "pnpm $(pnpm --version)"
else
  warn "pnpm no encontrado — instala: npm install -g pnpm"
  MISSING=$((MISSING+1))
fi

if command -v cdk &>/dev/null; then
  success "cdk $(cdk --version)"
else
  warn "AWS CDK CLI no encontrado — instala: npm install -g aws-cdk"
fi

echo ""

if $CHECK_ONLY; then
  if [ "$MISSING" -gt 0 ]; then
    error "$MISSING herramienta(s) faltante(s). Instálalas y vuelve a ejecutar."
    exit 1
  fi
  success "Todas las herramientas requeridas están disponibles."
  exit 0
fi

if [ "$MISSING" -gt 0 ]; then
  error "$MISSING herramienta(s) faltante(s). Instálalas antes de continuar."
  exit 1
fi

# ─── 2. Python — Backend .venv ────────────────────────────────────────────────
if $BACKEND_ONLY; then
  echo ""
  info "Configurando entorno Python (backend)..."

  cd "$ROOT_DIR/backend"

  PYTHON_VERSION="3.12"

  # Instalar Python 3.12 si pyenv está disponible y no lo tiene
  if command -v pyenv &>/dev/null; then
    if ! pyenv versions --bare | grep -q "^${PYTHON_VERSION}"; then
      info "Instalando Python ${PYTHON_VERSION} via pyenv..."
      pyenv install "$PYTHON_VERSION"
    fi
    pyenv local "$PYTHON_VERSION"
  fi

  # Crear virtualenv con uv
  if [ ! -d ".venv" ]; then
    info "Creando virtualenv con uv (Python ${PYTHON_VERSION})..."
    uv venv --python "$PYTHON_VERSION" .venv
    success "Virtualenv creado en backend/.venv"
  else
    success "Virtualenv ya existe en backend/.venv"
  fi

  # Instalar dependencias del proyecto
  info "Instalando dependencias del backend..."
  uv sync --all-extras
  success "Dependencias del backend instaladas"

  # Copiar .env si no existe
  if [ ! -f ".env" ]; then
    cp .env.example .env
    warn ".env copiado desde .env.example — edita backend/.env con tus valores reales"
  else
    success "backend/.env ya existe"
  fi

  cd "$ROOT_DIR"
fi

# ─── 3. Python — CDK .venv ────────────────────────────────────────────────────
if $INFRA_ONLY; then
  echo ""
  info "Configurando entorno Python (CDK)..."

  cd "$ROOT_DIR/infrastructure/cdk"

  if [ ! -d ".venv" ]; then
    info "Creando virtualenv para CDK..."
    uv venv --python 3.12 .venv
    success "Virtualenv CDK creado en infrastructure/cdk/.venv"
  else
    success "Virtualenv CDK ya existe"
  fi

  info "Instalando dependencias CDK..."
  uv pip install -r requirements.txt
  success "Dependencias CDK instaladas"

  cd "$ROOT_DIR"
fi

# ─── 4. Node.js — Frontend ────────────────────────────────────────────────────
if $FRONTEND_ONLY; then
  echo ""
  info "Configurando entorno Node.js (frontend)..."

  NODE_VERSION="22"

  # Activar Node 22 via fnm o nvm
  if command -v fnm &>/dev/null; then
    eval "$(fnm env)"
    if ! fnm list | grep -q "v${NODE_VERSION}"; then
      info "Instalando Node.js ${NODE_VERSION} via fnm..."
      fnm install "$NODE_VERSION"
    fi
    fnm use "$NODE_VERSION"
    success "Node.js $(node --version) activo (fnm)"

  elif [ -s "$HOME/.nvm/nvm.sh" ]; then
    \. "$HOME/.nvm/nvm.sh"
    if ! nvm list | grep -q "v${NODE_VERSION}"; then
      info "Instalando Node.js ${NODE_VERSION} via nvm..."
      nvm install "$NODE_VERSION"
    fi
    nvm use "$NODE_VERSION"
    success "Node.js $(node --version) activo (nvm)"
  fi

  # Habilitar corepack para pnpm
  if command -v corepack &>/dev/null; then
    corepack enable pnpm 2>/dev/null || true
  fi

  cd "$ROOT_DIR/frontend"

  info "Instalando dependencias del frontend con pnpm..."
  pnpm install
  success "Dependencias del frontend instaladas"

  if [ ! -f ".env" ]; then
    cp .env.example .env
    warn ".env copiado desde .env.example — edita frontend/.env con tus valores reales"
  else
    success "frontend/.env ya existe"
  fi

  cd "$ROOT_DIR"
fi

# ─── 5. direnv allow ──────────────────────────────────────────────────────────
echo ""
info "Registrando .envrc con direnv..."

if command -v direnv &>/dev/null; then
  direnv allow "$ROOT_DIR"
  success ".envrc autorizado — el entorno se activará automáticamente al hacer cd aquí"
else
  warn "direnv no está en PATH. El .envrc no se activará automáticamente."
  warn "Añade esto a tu shell profile (~/.zshrc o ~/.bash_profile):"
  echo ""
  echo '  eval "$(direnv hook zsh)"    # si usas zsh'
  echo '  eval "$(direnv hook bash)"   # si usas bash'
  echo ""
  warn "Luego ejecuta: direnv allow"
fi

# ─── 6. Verificar AWS profile ────────────────────────────────────────────────
echo ""
info "Verificando acceso AWS (perfil: salle-cajas)..."

if aws sts get-caller-identity --profile salle-cajas &>/dev/null; then
  ACCOUNT=$(aws sts get-caller-identity --profile salle-cajas --query Account --output text)
  success "AWS OK — Account: $ACCOUNT"
else
  warn "No se pudo verificar AWS. Asegúrate de que el perfil 'salle-cajas' esté configurado:"
  echo "  aws configure --profile salle-cajas"
fi

# ─── 7. Resumen ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  ✅ Setup completo — Fitness Room System${RESET}"
echo -e "${BOLD}═══════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}Próximos pasos:${RESET}"
echo ""
echo -e "  1. Editar variables de entorno:"
echo -e "     ${BLUE}nano backend/.env${RESET}   (DYNAMODB_TABLE_NAME, COGNITO_*)"
echo -e "     ${BLUE}nano frontend/.env${RESET}  (VITE_API_BASE_URL, VITE_COGNITO_*)"
echo ""
echo -e "  2. Iniciar desarrollo local:"
echo -e "     ${BLUE}make dev-backend${RESET}    → http://localhost:8000/docs"
echo -e "     ${BLUE}make dev-frontend${RESET}   → http://localhost:5173"
echo ""
echo -e "  3. Desplegar infraestructura AWS (primera vez):"
echo -e "     ${BLUE}make deploy-dev${RESET}"
echo ""
echo -e "  4. Ejecutar tests:"
echo -e "     ${BLUE}make test${RESET}"
echo ""
