export const BORNE_DESCRIPTIONS = {
  // Saídas Binárias (1-8)
  1: {
    label: "BO3-1",
    desc: "Sobrecorrente Fase A",
    group: "saída",
    fullName: "BO3 - Saída Binária 3",
    detail: "Sinaliza detecção de sobrecorrente (corrente excessiva) na fase A",
    related: "Função 50/50N (Proteção de Sobrecorrente)",
    usage: "Conecte a BI3 da maleta para ela receber o sinal de trip"
  },
  2: {
    label: "BO3-2",
    desc: "Sobrecorrente Fase A",
    group: "saída",
    fullName: "BO3 - Saída Binária 3",
    detail: "Sinaliza detecção de sobrecorrente (corrente excessiva) na fase A",
    related: "Função 50/50N (Proteção de Sobrecorrente)",
    usage: "Conecte a BI3 da maleta para ela receber o sinal de trip"
  },
  3: {
    label: "BO4-1",
    desc: "Falta à Terra",
    group: "saída",
    fullName: "BO4 - Saída Binária 4",
    detail: "Sinaliza detecção de FALTA À TERRA (L-G) - corrente de fase desviando para o neutro/terra",
    related: "Função 50N/51N (Proteção de Falta à Terra)",
    usage: "Conecte a BI4 da maleta. Ativa quando há desequilíbrio de fase ou falta para terra"
  },
  4: {
    label: "BO4-2",
    desc: "Falta à Terra",
    group: "saída",
    fullName: "BO4 - Saída Binária 4",
    detail: "Sinaliza detecção de FALTA À TERRA (L-G) - corrente de fase desviando para o neutro/terra",
    related: "Função 50N/51N (Proteção de Falta à Terra)",
    usage: "Conecte a BI4 da maleta. Ativa quando há desequilíbrio de fase ou falta para terra"
  },
  5: {
    label: "BO5-1",
    desc: "Sequência Negativa",
    group: "saída",
    fullName: "BO5 - Saída Binária 5",
    detail: "Sinaliza detecção de SEQUÊNCIA NEGATIVA - desequilíbrio entre fases (motores girando ao contrário)",
    related: "Função 47 (Proteção de Sequência Negativa)",
    usage: "Conecte a BI5 da maleta. Protege motores contra inversão de fase"
  },
  6: {
    label: "BO5-2",
    desc: "Sequência Negativa",
    group: "saída",
    fullName: "BO5 - Saída Binária 5",
    detail: "Sinaliza detecção de SEQUÊNCIA NEGATIVA - desequilíbrio entre fases (motores girando ao contrário)",
    related: "Função 47 (Proteção de Sequência Negativa)",
    usage: "Conecte a BI5 da maleta. Protege motores contra inversão de fase"
  },
  7: {
    label: "BO6-1",
    desc: "Sub-Frequência",
    group: "saída",
    fullName: "BO6 - Saída Binária 6",
    detail: "Sinaliza detecção de SUB-FREQUÊNCIA - frequência da rede abaixo do normal (falta de geração)",
    related: "Função 81U (Proteção de Sub-Frequência)",
    usage: "Conecte a BI6 da maleta. Protege contra colapso da frequência da rede"
  },
  8: {
    label: "BO6-2",
    desc: "Sub-Frequência",
    group: "saída",
    fullName: "BO6 - Saída Binária 6",
    detail: "Sinaliza detecção de SUB-FREQUÊNCIA - frequência da rede abaixo do normal (falta de geração)",
    related: "Função 81U (Proteção de Sub-Frequência)",
    usage: "Conecte a BI6 da maleta. Protege contra colapso da frequência da rede"
  },

  // Feedback do Disjuntor (9-12)
  9: {
    label: "52a-1",
    desc: "CB Fechado",
    group: "feedback",
    fullName: "52a - Contato Auxiliar Fechado",
    detail: "Indica que o DISJUNTOR está FECHADO (alimentação ligada, normal). Fisicamente acoplado ao mecanismo.",
    related: "Status do Disjuntor",
    usage: "Conecte a BI1 da maleta. Quando CB está fechado, este contato fica fechado."
  },
  10: {
    label: "52a-2",
    desc: "CB Fechado",
    group: "feedback",
    fullName: "52a - Contato Auxiliar Fechado",
    detail: "Indica que o DISJUNTOR está FECHADO (alimentação ligada, normal). Fisicamente acoplado ao mecanismo.",
    related: "Status do Disjuntor",
    usage: "Conecte a BI1 da maleta. Quando CB está fechado, este contato fica fechado."
  },
  11: {
    label: "52b-1",
    desc: "CB Aberto",
    group: "feedback",
    fullName: "52b - Contato Auxiliar Aberto",
    detail: "Indica que o DISJUNTOR está ABERTO (trip realizado, desligado). Fisicamente acoplado ao mecanismo.",
    related: "Status do Disjuntor",
    usage: "Conecte a BI2 da maleta. Quando CB está aberto, este contato fica fechado."
  },
  12: {
    label: "52b-2",
    desc: "CB Aberto",
    group: "feedback",
    fullName: "52b - Contato Auxiliar Aberto",
    detail: "Indica que o DISJUNTOR está ABERTO (trip realizado, desligado). Fisicamente acoplado ao mecanismo.",
    related: "Status do Disjuntor",
    usage: "Conecte a BI2 da maleta. Quando CB está aberto, este contato fica fechado."
  },

  // Bobinas de Comando (13-16)
  13: {
    label: "TC-1",
    desc: "Bobina Trip",
    group: "comando",
    fullName: "TC - Trip Coil (Bobina de Trip)",
    detail: "Bobina eletromagnética que ABRE o disjuntor. Quando energizada, puxa mecanismo de abertura.",
    related: "Comando de Abertura do Disjuntor",
    usage: "Conecte a fonte de energia (24VDC típico). Quando ativada, abre o CB."
  },
  14: {
    label: "TC-2",
    desc: "Bobina Trip",
    group: "comando",
    fullName: "TC - Trip Coil (Bobina de Trip)",
    detail: "Bobina eletromagnética que ABRE o disjuntor. Quando energizada, puxa mecanismo de abertura.",
    related: "Comando de Abertura do Disjuntor",
    usage: "Conecte a fonte de energia (24VDC típico). Quando ativada, abre o CB."
  },
  15: {
    label: "FC-1",
    desc: "Bobina Fechamento",
    group: "comando",
    fullName: "FC - Close Coil (Bobina de Fechamento)",
    detail: "Bobina eletromagnética que FECHA o disjuntor. Quando energizada, puxa mecanismo de fechamento (reclosing).",
    related: "Comando de Fechamento do Disjuntor",
    usage: "Conecte a fonte de energia (24VDC típico). Quando ativada, fecha o CB."
  },
  16: {
    label: "FC-2",
    desc: "Bobina Fechamento",
    group: "comando",
    fullName: "FC - Close Coil (Bobina de Fechamento)",
    detail: "Bobina eletromagnética que FECHA o disjuntor. Quando energizada, puxa mecanismo de fechamento (reclosing).",
    related: "Comando de Fechamento do Disjuntor",
    usage: "Conecte a fonte de energia (24VDC típico). Quando ativada, fecha o CB."
  }
};

export const BORNE_GROUPS = {
  saída: {
    title: "SAÍDAS BINÁRIAS (BO)",
    description: "Sinais que o RELÉ manda para a MALETA quando detecta uma falta",
    icon: "📤",
    color: "#FFB84D"
  },
  feedback: {
    title: "FEEDBACK DO DISJUNTOR (52a/52b)",
    description: "Sinais que o DISJUNTOR manda para o RELÉ informando seu status",
    icon: "📡",
    color: "#81C784"
  },
  comando: {
    title: "BOBINAS DE COMANDO (TC/FC)",
    description: "Ordens que o RELÉ manda para o DISJUNTOR agir (abrir ou fechar)",
    icon: "🎛️",
    color: "#64B5F6"
  }
};
