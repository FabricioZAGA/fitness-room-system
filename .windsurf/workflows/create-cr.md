---
description: Crea un Change Request completo y Risk Assessment para una branch específica
---

## Crear Change Request (CR) y Risk Assessment

### 1. Identificar los cambios de la branch actual
// turbo
```bash
git log main..HEAD --oneline
git diff main..HEAD --stat
```

### 2. Analizar el impacto de los cambios

Revisar qué stacks de CDK se ven afectados:
```bash
cd infrastructure/cdk && cdk diff --profile salle-cajas --context env=dev 2>&1
```

### 3. Generar resumen de cambios

El AI debe generar un CR con el siguiente formato:

---
**CHANGE REQUEST — FITNESS ROOM SYSTEM**

**Branch**: `[nombre de branch]`
**Autor**: FabricioZAGA
**Fecha**: [fecha actual]
**Ambiente target**: [dev/staging/prod]

**Descripción de cambios:**
- [Lista de cambios]

**Archivos modificados:**
- [Lista de archivos]

**Stacks CDK afectados:**
- [Lista de stacks]

**Tipo de cambio:** [Feature / Bug Fix / Refactor / Config / Infrastructure]

**RISK ASSESSMENT:**

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Downtime | Bajo | Alto | Lambda deploy es zero-downtime |
| Data loss | Ninguno | Crítico | No hay cambios de schema en DynamoDB |
| Performance | Bajo | Medio | TBD |
| Rollback plan | - | - | `cdk deploy` versión anterior |

**Pre-deploy checklist:**
- [ ] Tests pasando: `make test`
- [ ] Lint pasando: `make lint`
- [ ] CDK diff revisado
- [ ] Variables de entorno actualizadas
- [ ] Documentación actualizada

**Post-deploy checklist:**
- [ ] API health check: `GET /health`
- [ ] Logs en CloudWatch sin errores
- [ ] Funcionalidad verificada en ambiente target

---

### 4. Guardar el CR
```bash
mkdir -p docs/change-requests
# Guardar el CR como docs/change-requests/CR-XXXX-YYYY-MM-DD.md
```
