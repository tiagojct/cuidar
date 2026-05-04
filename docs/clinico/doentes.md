# Gerir doentes

## Criar um novo doente

1. Aceda a **Doentes → + Novo doente**
2. Preencha:
   - **Identificador** — pseudónimo ou código (não use o nome real)
   - **Cuidador responsável** — seleccione da lista ou [crie novo](../clinico/doentes.md)
   - **Diagnóstico principal** — determina o modelo de sintomas apresentado ao cuidador
   - **Medicação habitual** — visível ao cuidador; actualize sempre que houver alterações
   - **Contacto da equipa** — aparece ao cuidador nos alertas
   - **Email da equipa** — recebe notificação automática quando há alerta de sintomas

!!! info "Pseudonimização"
    O CUIDAR foi desenhado para não armazenar o nome real dos doentes. Use um código interno (ex: "Doente A", "D2024-001").

---

## Arquivar vs. Eliminar

| Acção | Efeito |
|---|---|
| **Arquivar** | Doente fica inactivo; todos os dados preservados; recuperável |
| **Eliminar** | Apaga permanentemente o doente e todos os registos e mensagens |

!!! danger "Eliminar é irreversível"
    Todos os registos de sintomas, mensagens do cuidador e notas clínicas são apagados.

---

## Limiares de alerta personalizados

Por omissão, um alerta é gerado quando:
- **Bem-estar ≤ 3** (em 10)
- **Qualquer sintoma ≥ 7** (em 10)

Pode ajustar estes limiares por doente no formulário de edição, secção "Limiares de alerta personalizados".

---

## Indicador de inactividade

Na lista de doentes, um ponto vermelho (●) aparece junto ao doente quando não há registos há mais de 14 dias. Um aviso também aparece no topo da lista.

---

## Notas clínicas por registo

Na ficha do doente (visão clínico), pode adicionar uma nota clínica a cada registo de sintomas. Visível apenas ao clínico.

---

## Mensagens do cuidador

Na ficha do doente, o ícone **Mensagens** mostra quantas mensagens não lidas existem. Clique para ver e marcar como lidas.
