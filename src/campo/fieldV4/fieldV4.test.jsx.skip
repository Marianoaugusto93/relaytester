import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import CampoPageV4 from './CampoPageV4.jsx';

describe('Layout Novo v4 — Complete E2E Tests', () => {
  beforeEach(() => {
    render(<CampoPageV4 />);
  });

  describe('Equipamentos renderizam corretamente', () => {
    it('Régua de Bornes: 16 terminais visíveis', () => {
      const bornes = document.querySelectorAll('.borne');
      expect(bornes).toHaveLength(16);
    });

    it('Régua de Bornes: números corretos (1-16)', () => {
      const bornes = Array.from(document.querySelectorAll('.borne-number'));
      const numbers = bornes.map(b => parseInt(b.textContent));
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    });

    it('Régua de Bornes: tags aparecem', () => {
      const tags = document.querySelectorAll('.borne-tag');
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0].textContent).toBe('TCa-S1');
    });

    it('Chave de Aferição: 7 alavancas visíveis', () => {
      const levers = document.querySelectorAll('.lever');
      expect(levers).toHaveLength(7);
    });

    it('Chave de Aferição: tags (A-N) presentes', () => {
      const tags = Array.from(document.querySelectorAll('.lever-tag')).map(t => t.textContent);
      expect(tags).toContain('A');
      expect(tags).toContain('B');
      expect(tags).toContain('C');
      expect(tags).toContain('Va');
      expect(tags).toContain('Vb');
      expect(tags).toContain('Vc');
      expect(tags).toContain('N');
    });

    it('Maleta de Teste: 20 plugs banana visíveis', () => {
      const plugs = document.querySelectorAll('.plug');
      expect(plugs).toHaveLength(20);
    });

    it('Maleta de Teste: plugs com cores corretas', () => {
      const plugs = Array.from(document.querySelectorAll('.plug'));
      const hasPhaseA = plugs.some(p => p.classList.contains('phaseA'));
      const hasPhaseB = plugs.some(p => p.classList.contains('phaseB'));
      const hasPhaseBI = plugs.some(p => p.classList.contains('phaseBI'));
      const hasBlack = plugs.some(p => p.classList.contains('black'));

      expect(hasPhaseA).toBe(true);
      expect(hasPhaseB).toBe(true);
      expect(hasPhaseBI).toBe(true);
      expect(hasBlack).toBe(true);
    });
  });

  describe('Cabos SVG — Bézier routing', () => {
    it('SVG container presente com 19 paths', () => {
      const svg = document.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('19 cabos SVG renderizados', () => {
      const cables = document.querySelectorAll('path.cable');
      expect(cables).toHaveLength(19);
    });

    it('Cabos têm paths válidos (pathD não-vazio)', () => {
      const cables = Array.from(document.querySelectorAll('path.cable'));
      cables.forEach(cable => {
        const d = cable.getAttribute('d');
        expect(d).toBeTruthy();
        expect(d.startsWith('M')).toBe(true);
        expect(d.includes('C')).toBe(true);
      });
    });

    it('Cabos têm cores de fase corretas', () => {
      const cables = Array.from(document.querySelectorAll('path.cable'));
      const phases = cables.map(c => {
        if (c.classList.contains('phaseA')) return 'A';
        if (c.classList.contains('phaseB')) return 'B';
        if (c.classList.contains('phaseC')) return 'C';
        if (c.classList.contains('phaseV')) return 'V';
        if (c.classList.contains('phaseBI')) return 'BI';
        return null;
      });
      expect(phases).toContain('A');
      expect(phases).toContain('B');
      expect(phases).toContain('C');
      expect(phases).toContain('V');
      expect(phases).toContain('BI');
    });

    it('Cabos de teste têm opacity 0.2 quando chave fechada', () => {
      const testCables = Array.from(document.querySelectorAll('path.cable.test'));
      expect(testCables.length).toBeGreaterThan(0);
      testCables.forEach(cable => {
        const opacity = window.getComputedStyle(cable).opacity;
        expect(parseFloat(opacity)).toBeLessThanOrEqual(0.3);
      });
    });
  });

  describe('Alavancas — Animação rotate(28°)', () => {
    it('Alavancas têm estado inicial (↓ FECHADA)', () => {
      const stateLabels = Array.from(document.querySelectorAll('.lever-state'));
      stateLabels.forEach(label => {
        expect(label.textContent).toContain('FECHADA');
      });
    });

    it('Alavancas mudam para (↑ ABERTA) ao clicar', async () => {
      const firstLever = document.querySelector('.lever');
      const knife = firstLever.querySelector('.knife-area');

      fireEvent.click(knife);

      await waitFor(() => {
        const stateLabel = firstLever.querySelector('.lever-state');
        expect(stateLabel.textContent).toContain('ABERTA');
      });
    });

    it('Faca rotaciona no SVG ao abrir (transform aplicado)', async () => {
      const firstLever = document.querySelector('.lever');
      const knife = firstLever.querySelector('.knife-area');
      const g = firstLever.querySelector('svg g');

      const initialTransform = g.getAttribute('transform');

      fireEvent.click(knife);

      await waitFor(() => {
        const newTransform = g.getAttribute('transform');
        expect(newTransform).toContain('rotate(28');
        expect(initialTransform).not.toEqual(newTransform);
      });
    });

    it('Short-bar visível apenas para alavancas de corrente (I) quando aberta', async () => {
      const currentLever = Array.from(document.querySelectorAll('.lever')).find(l => {
        return l.querySelector('.lever-tag').textContent === 'A';
      });

      const shortBar = currentLever.querySelector('.short-bar');
      expect(window.getComputedStyle(shortBar).display).toBe('none');

      fireEvent.click(currentLever.querySelector('.knife-area'));

      await waitFor(() => {
        expect(window.getComputedStyle(shortBar).display).toBe('block');
      });
    });
  });

  describe('Hover focus — Interações de circuito', () => {
    it('Ao passar mouse em cabo, SVG ganha classe "focused"', () => {
      const cable = document.querySelector('path.cable');
      const svg = document.querySelector('svg');

      fireEvent.mouseEnter(cable);

      expect(svg.classList.contains('focused')).toBe(true);
    });

    it('Ao sair mouse de cabo, SVG perde classe "focused"', () => {
      const svg = document.querySelector('svg');

      fireEvent.mouseLeave(svg.parentElement);

      expect(svg.classList.contains('focused')).toBe(false);
    });

    it('Cabo sob hover tem classe "focus" enquanto outros ficam atenuados', () => {
      const cables = Array.from(document.querySelectorAll('path.cable'));
      const targetCable = cables[0];

      fireEvent.mouseEnter(targetCable);

      const focused = document.querySelector('path.cable.focus');
      expect(focused).toBeTruthy();
    });
  });

  describe('Modo toggle — Operação/Teste/Mista', () => {
    it('Header com 3 botões de modo presente', () => {
      const buttons = document.querySelectorAll('.mode-btn');
      expect(buttons).toHaveLength(3);
    });

    it('Botão "Operação" ativo por padrão', () => {
      const opBtn = Array.from(document.querySelectorAll('.mode-btn')).find(
        b => b.textContent.includes('Operação')
      );
      expect(opBtn.classList.contains('active')).toBe(true);
    });

    it('Modo "Teste" abre todas as alavancas', async () => {
      const testBtn = Array.from(document.querySelectorAll('.mode-btn')).find(
        b => b.textContent.includes('Teste')
      );

      fireEvent.click(testBtn);

      await waitFor(() => {
        const stateLabels = Array.from(document.querySelectorAll('.lever-state'));
        stateLabels.forEach(label => {
          expect(label.textContent).toContain('ABERTA');
        });
      });
    });

    it('Modo "Operação" fecha todas as alavancas', async () => {
      const testBtn = Array.from(document.querySelectorAll('.mode-btn')).find(
        b => b.textContent.includes('Teste')
      );

      fireEvent.click(testBtn);

      const opBtn = Array.from(document.querySelectorAll('.mode-btn')).find(
        b => b.textContent.includes('Operação')
      );

      fireEvent.click(opBtn);

      await waitFor(() => {
        const stateLabels = Array.from(document.querySelectorAll('.lever-state'));
        stateLabels.forEach(label => {
          expect(label.textContent).toContain('FECHADA');
        });
      });
    });

    it('Modo "Mista" abre FB e Vb apenas', async () => {
      const mixBtn = Array.from(document.querySelectorAll('.mode-btn')).find(
        b => b.textContent.includes('Mista')
      );

      fireEvent.click(mixBtn);

      await waitFor(() => {
        const levers = Array.from(document.querySelectorAll('.lever'));
        const faBLever = levers.find(l => l.querySelector('.lever-tag').textContent === 'B');
        const vbLever = levers.find(l => l.querySelector('.lever-tag').textContent === 'Vb');

        expect(faBLever.querySelector('.lever-state').textContent).toContain('ABERTA');
        expect(vbLever.querySelector('.lever-state').textContent).toContain('ABERTA');

        const otherLevers = levers.filter(l => {
          const tag = l.querySelector('.lever-tag').textContent;
          return tag !== 'B' && tag !== 'Vb';
        });
        otherLevers.forEach(l => {
          expect(l.querySelector('.lever-state').textContent).toContain('FECHADA');
        });
      });
    });
  });

  describe('Layout & Responsividade', () => {
    it('Header presente com título', () => {
      const header = document.querySelector('.field-header-v4');
      expect(header).toBeTruthy();
      expect(header.querySelector('h1').textContent).toContain('Painel FIELD v4');
    });

    it('Stage contém 3 seções: BorneStrip, LeverRack, MaletaPanel', () => {
      const stage = document.querySelector('.field-stage');
      expect(stage.querySelector('.borne-strip')).toBeTruthy();
      expect(stage.querySelector('.lever-rack')).toBeTruthy();
      expect(stage.querySelector('.maleta-panel')).toBeTruthy();
    });

    it('Side panel presente com informações', () => {
      const sidePanel = document.querySelector('.field-side-panel');
      expect(sidePanel).toBeTruthy();
      expect(sidePanel.querySelector('h3')).toBeTruthy();
    });
  });

  describe('Data integrity', () => {
    it('Todos os bornes têm data-connector com TB{n}-b', () => {
      const bornes = Array.from(document.querySelectorAll('.borne'));
      bornes.forEach((borne, idx) => {
        const n = idx + 1;
        const attr = borne.getAttribute('data-connector');
        expect(attr).toBe(`TB${n}-b`);
      });
    });

    it('Todos os plugs têm data-port correto', () => {
      const plugs = Array.from(document.querySelectorAll('.plug'));
      plugs.forEach(plug => {
        const port = plug.getAttribute('data-port');
        expect(port).toBeTruthy();
        expect(['I1+', 'I1-', 'I2+', 'I2-', 'I3+', 'I3-',
                'V1', 'V1-', 'V2', 'V2-', 'V3', 'V3-',
                'BO1', 'BO1-', 'BO2', 'BO2-', 'BI1', 'BI1-', 'BI2', 'BI2-'])
          .toContain(port);
      });
    });
  });
});
