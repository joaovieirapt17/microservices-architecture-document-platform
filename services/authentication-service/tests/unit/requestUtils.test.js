const { getClientIp, getUserAgent } = require('../../src/utils/requestUtils');

describe('Request Utils - Unit Tests', () => {
  describe('getClientIp', () => {
    it('deve extrair IP do header x-forwarded-for', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      };

      const ip = getClientIp(req);

      expect(ip).toBe('192.168.1.1');
    });

    it('deve extrair IP do header x-real-ip', () => {
      const req = {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      };

      const ip = getClientIp(req);

      expect(ip).toBe('192.168.1.2');
    });

    it('deve extrair IP de connection.remoteAddress', () => {
      const req = {
        headers: {},
        connection: {
          remoteAddress: '192.168.1.3',
        },
      };

      const ip = getClientIp(req);

      expect(ip).toBe('192.168.1.3');
    });

    it('deve extrair IP de socket.remoteAddress', () => {
      const req = {
        headers: {},
        socket: {
          remoteAddress: '192.168.1.4',
        },
      };

      const ip = getClientIp(req);

      expect(ip).toBe('192.168.1.4');
    });

    it('deve retornar "unknown" se não encontrar IP', () => {
      const req = {
        headers: {},
      };

      const ip = getClientIp(req);

      expect(ip).toBe('unknown');
    });

    it('deve priorizar x-forwarded-for sobre outros headers', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
        connection: {
          remoteAddress: '192.168.1.3',
        },
      };

      const ip = getClientIp(req);

      expect(ip).toBe('192.168.1.1');
    });

    it('deve extrair primeiro IP de lista no x-forwarded-for', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.2, 192.0.2.3',
        },
      };

      const ip = getClientIp(req);

      expect(ip).toBe('203.0.113.1');
    });

    it('deve lidar com IPv6', () => {
      const req = {
        headers: {
          'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        },
      };

      const ip = getClientIp(req);

      expect(ip).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('deve lidar com espaços no x-forwarded-for', () => {
      const req = {
        headers: {
          'x-forwarded-for': ' 192.168.1.1 , 10.0.0.1 ',
        },
      };

      const ip = getClientIp(req);

      expect(ip).toBe(' 192.168.1.1 ');
    });

    it('deve lidar com headers undefined', () => {
      const req = {
        headers: {
          'x-forwarded-for': undefined,
        },
      };

      const ip = getClientIp(req);

      expect(ip).toBe('unknown');
    });
  });

  describe('getUserAgent', () => {
    it('deve extrair user agent do header', () => {
      const req = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      const userAgent = getUserAgent(req);

      expect(userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('deve retornar "unknown" se não houver user agent', () => {
      const req = {
        headers: {},
      };

      const userAgent = getUserAgent(req);

      expect(userAgent).toBe('unknown');
    });

    it('deve lidar com diferentes browsers', () => {
      const browsers = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) Firefox/89.0',
      ];

      browsers.forEach(browser => {
        const req = {
          headers: {
            'user-agent': browser,
          },
        };

        const userAgent = getUserAgent(req);

        expect(userAgent).toBe(browser);
      });
    });

    it('deve lidar com mobile user agents', () => {
      const req = {
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
        },
      };

      const userAgent = getUserAgent(req);

      expect(userAgent).toContain('iPhone');
    });

    it('deve lidar com bot user agents', () => {
      const req = {
        headers: {
          'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
        },
      };

      const userAgent = getUserAgent(req);

      expect(userAgent).toContain('Googlebot');
    });

    it('deve retornar "unknown" se user agent for string vazia', () => {
      const req = {
        headers: {
          'user-agent': '',
        },
      };

      const userAgent = getUserAgent(req);

      // String vazia é falsy, então retorna 'unknown'
      expect(userAgent).toBe('unknown');
    });

    it('deve lidar com headers case-insensitive', () => {
      const req = {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      };

      // Express normaliza headers para lowercase
      const userAgent = getUserAgent(req);

      // Como Express normaliza, o teste deve falhar se headers não forem lowercase
      expect(userAgent).toBe('unknown');
    });
  });

  describe('Edge Cases', () => {
    it('deve lidar com request null ou undefined', () => {
      expect(() => getClientIp(null)).toThrow();
      expect(() => getUserAgent(null)).toThrow();
    });

    it('deve lidar com headers null', () => {
      const req = {
        headers: null,
      };

      expect(() => getClientIp(req)).toThrow();
      expect(() => getUserAgent(req)).toThrow();
    });

    it('deve lidar com valores especiais no x-forwarded-for', () => {
      const specialCases = [
        { headers: { 'x-forwarded-for': 'unknown' } },
        { headers: { 'x-forwarded-for': '0.0.0.0' } },
        { headers: { 'x-forwarded-for': '127.0.0.1' } },
      ];

      specialCases.forEach(req => {
        const ip = getClientIp(req);
        expect(typeof ip).toBe('string');
        expect(ip.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration with Express Request', () => {
    it('deve funcionar com objecto request típico do Express', () => {
      const mockExpressReq = {
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0',
          'host': 'localhost:3000',
          'accept': 'application/json',
        },
        connection: {
          remoteAddress: '::1',
        },
        socket: {
          remoteAddress: '::1',
        },
      };

      const ip = getClientIp(mockExpressReq);
      const userAgent = getUserAgent(mockExpressReq);

      expect(ip).toBe('192.168.1.100');
      expect(userAgent).toBe('Mozilla/5.0');
    });
  });
});