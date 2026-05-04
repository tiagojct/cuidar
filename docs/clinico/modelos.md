# Modelos de sintomas

Os modelos definem que sintomas são apresentados ao cuidador no formulário de registo diário, consoante o diagnóstico principal do doente.

## Modelos disponíveis

| Condição | Sintomas |
|---|---|
| Oncologia | Dor, Náuseas, Apetite, Fadiga, Dispneia, Ansiedade, Obstipação, Sono |
| Insuficiência Cardíaca | Dispneia, Edema, Fadiga, Apetite, Ansiedade, Sono |
| DPOC | Dispneia, Tosse, Fadiga, Ansiedade, Sono, Apetite |
| Insuficiência Renal Crónica | Fadiga, Dor, Náuseas, Apetite, Ansiedade, Sono |
| Demência | Dor, Agitação, Apetite, Sono, Ansiedade |
| ELA | Dispneia, Fadiga, Dor, Deglutição, Ansiedade, Sono |
| Geral | Dor, Apetite, Fadiga, Sono, Ansiedade |

## Criar um modelo personalizado

1. **Modelos → + Novo modelo**
2. Seleccione a condição
3. Adicione sintomas: cada sintoma tem uma **chave interna** (ex: `dor`) e um **rótulo** visível ao cuidador (ex: `Dor`)
4. A ordem dos sintomas no formulário segue a ordem definida no modelo

!!! info "Chave interna"
    A chave interna é usada nos dados armazenados. Uma vez criada, não altere — mudá-la quebra o histórico de registos anteriores.

## Modelo de fallback

Se não existir modelo para o diagnóstico do doente, o sistema usa automaticamente o modelo "Geral".
