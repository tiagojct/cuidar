# Alertas e notificações

## Como funcionam os alertas

O CUIDAR gera alertas automáticos quando os valores registados pelo cuidador ultrapassam limiares definidos.

### Limiares padrão
- Bem-estar geral **≤ 3** (em 10)
- Qualquer sintoma **≥ 7** (em 10)

### Limiares personalizados
Podem ser ajustados por doente em **Doentes → Editar → Limiares de alerta personalizados**.

---

## O que acontece quando há um alerta

1. **O cuidador vê um banner** imediatamente após guardar o registo, com o nível de gravidade e indicação de acção
2. **A equipa recebe um email** (se o campo "Email da equipa" estiver preenchido no doente)
3. **Na lista de doentes**, o doente aparece com um ponto vermelho (●) na coluna "Último registo" se não houver registos há mais de 14 dias

---

## Níveis de gravidade (banner do cuidador)

| Nível | Condição |
|---|---|
| Urgente | Bem-estar ≤ 1 ou qualquer sintoma = 10 |
| Contacte a equipa | Bem-estar ≤ 3 ou qualquer sintoma ≥ 7 |
| Vigilância | Bem-estar ≤ 4 ou qualquer sintoma ≥ 5 |
| Estável | Todos os valores abaixo dos limiares |

---

## Email de alerta

Configure o email da equipa em **Doentes → Editar → Email da equipa (alertas)**.

!!! note "SMTP não configurado"
    Se o servidor não tiver SMTP configurado, os emails são silenciosamente ignorados. Verifique as variáveis de ambiente `SMTP_*` na configuração.
