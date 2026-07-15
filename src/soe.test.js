import { describe, it, expect } from "vitest";
import { soeEvent, soePush, soeToCsv, SOE_TYPES } from "./soe.js";

describe("soeEvent", () => {
  it("gera campos obrigatórios", () => {
    const e = soeEvent({ type: SOE_TYPES.TRIP, icon: "⚡", text: "Relay trip: 50-1", dt: "T+0.050s" });
    expect(e.type).toBe(SOE_TYPES.TRIP);
    expect(e.icon).toBe("⚡");
    expect(e.text).toBe("Relay trip: 50-1");
    expect(e.dt).toBe("T+0.050s");
    expect(typeof e.time).toBe("string");
    expect(e.time).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    expect(typeof e.tsMs).toBe("number");
    expect(e.tsMs).toBeGreaterThan(0);
  });

  it("dt padrão vazio", () => {
    const e = soeEvent({ type: SOE_TYPES.INFO, icon: "i", text: "ok" });
    expect(e.dt).toBe("");
  });
});

describe("soePush", () => {
  it("insere no início (mais recente primeiro)", () => {
    const e1 = soeEvent({ type: SOE_TYPES.INFO, icon: "a", text: "primeiro" });
    const e2 = soeEvent({ type: SOE_TYPES.INFO, icon: "b", text: "segundo" });
    const list = soePush([], e1);
    const list2 = soePush(list, e2);
    expect(list2[0].text).toBe("segundo");
    expect(list2[1].text).toBe("primeiro");
  });

  it("respeita cap — trunca no tamanho máximo", () => {
    let list = [];
    for (let i = 0; i < 10; i++) {
      list = soePush(list, soeEvent({ type: SOE_TYPES.INFO, icon: "-", text: `ev${i}` }), 5);
    }
    expect(list.length).toBe(5);
  });

  it("FIFO: mantém os mais recentes quando cap é atingido", () => {
    let list = [];
    for (let i = 0; i < 7; i++) {
      list = soePush(list, soeEvent({ type: SOE_TYPES.INFO, icon: "-", text: `ev${i}` }), 5);
    }
    // ev6 é o mais recente (índice 0), ev2 é o mais antigo restante (índice 4)
    expect(list[0].text).toBe("ev6");
    expect(list[4].text).toBe("ev2");
  });

  it("cap padrão 500", () => {
    let list = [];
    for (let i = 0; i < 600; i++) {
      list = soePush(list, soeEvent({ type: SOE_TYPES.INFO, icon: "-", text: `ev${i}` }));
    }
    expect(list.length).toBe(500);
  });
});

describe("soeToCsv", () => {
  it("header correto", () => {
    const csv = soeToCsv([]);
    expect(csv.startsWith("timestamp;type;text;dt")).toBe(true);
  });

  it("ordem mais antigo primeiro (reverso da lista)", () => {
    const e1 = soeEvent({ type: SOE_TYPES.INJ_START, icon: "⚡", text: "primeiro" });
    const e2 = soeEvent({ type: SOE_TYPES.INJ_STOP, icon: "⏹", text: "segundo" });
    // lista: [e2, e1] (mais recente no índice 0)
    const list = [e2, e1];
    const csv = soeToCsv(list);
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain("primeiro"); // e1 primeiro no CSV
    expect(lines[2]).toContain("segundo");  // e2 segundo no CSV
  });

  it("escapa ponto-e-vírgula no texto", () => {
    const e = soeEvent({ type: SOE_TYPES.INFO, icon: "-", text: "a;b;c", dt: "" });
    const csv = soeToCsv([e]);
    expect(csv).toContain('"a;b;c"');
  });

  it("dobra aspas duplas internas", () => {
    const e = soeEvent({ type: SOE_TYPES.INFO, icon: "-", text: 'diz "oi"', dt: "" });
    const csv = soeToCsv([e]);
    // texto com aspas → campo envolvido em aspas com aspas dobradas
    expect(csv).toContain('"diz ""oi"""');
  });

  it("escapa quebra de linha no texto", () => {
    const e = soeEvent({ type: SOE_TYPES.INFO, icon: "-", text: "linha1\nlinha2", dt: "" });
    const csv = soeToCsv([e]);
    expect(csv).toContain('"linha1\nlinha2"');
  });

  it("lista vazia retorna só o header", () => {
    const csv = soeToCsv([]);
    expect(csv).toBe("timestamp;type;text;dt");
  });
});
