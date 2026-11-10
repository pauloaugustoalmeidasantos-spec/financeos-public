import { formatCurrency, formatPercent, formatDate, getMonthsArray } from '../formatters';

describe('BRL Formatters Utils', () => {

  describe('formatCurrency', () => {
    it('deve tratar 0 perfeitamente sem erros e com BRL fixo', () => {
      // Intl behavior can variate spaces internally based on local node.js distributions
      const str = formatCurrency(0).replace(/\s/g, ' ');
      expect(str).toContain('0,00');
    });

    it('deve manter duas casas e marcadores de unidade milhar PT-BR', () => {
      const str = formatCurrency(1234.56).replace(/\s/g, ' ');
      expect(str).toContain('1.234,56');
    });

    it('Lida com fluxos negativos', () => {
      const str = formatCurrency(-500);
      expect(str).toContain('-R$');
      expect(str).toContain('500,00');
    });

    it('Agrupa casas milionárias corretamente', () => {
      const str = formatCurrency(1000000).replace(/\s/g, ' ');
      expect(str).toContain('1.000.000,00');
    });
  });

  describe('formatPercent', () => {
    it('traduz decimais absolutos em percentual visual amarrando PT-BR', () => {
      // Because toLocaleString can output "8,3 %" or "8,3%", we check contents
      expect(formatPercent(0.0825).replace(/\s/g, '')).toBe("8,3%");
    });

    it('Lida coerentemente com inteiros cravando no maximo do percentual', () => {
      expect(formatPercent(1.0).replace(/\s/g, '')).toBe("100,0%");
    });

    it('Zera limpo', () => {
      expect(formatPercent(0).replace(/\s/g, '')).toBe("0,0%");
    });
  });

  describe('formatDate', () => {
    const rawDate = new Date("2024-03-15T10:00:00.000Z"); // Fixado GMT UTC avoid timezone flaking

    it('Lida perfeitamente com layout DD/MM/YYYY padrão brasileiro de contador', () => {
      const f = formatDate(rawDate, 'short');
      // Could be 15/03/2024
      const [day, month, year] = f.split('/');
      expect(month).toBe('03');
      expect(year).toBe('2024');
    });

    it('Escreve em string literal formato extenso nativo', () => {
      const f = formatDate(rawDate, 'long');
      expect(f.toLowerCase()).toContain('março');
    });

    it('Consegue receber string isolada', () => {
      const f = formatDate("2024-03-15T12:00:00Z", 'short');
      expect(f).toBeDefined();
    });
  });

  describe('getMonthsArray', () => {
    it('Sobe matriz temporal no range especificado sem faltar indices', () => {
      const n = 6;
      const res = getMonthsArray(n);
      expect(res).toHaveLength(n);
      
      // Last element is the current month
      const current = new Date();
      expect(res[res.length - 1].date.getMonth()).toBe(current.getMonth());
      expect(res[res.length - 1].date.getFullYear()).toBe(current.getFullYear());
    });
  });

});
