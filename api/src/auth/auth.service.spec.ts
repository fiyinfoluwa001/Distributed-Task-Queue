import { Test } from '@nestjs/testing';
  import { JwtService } from '@nestjs/jwt';
  import { AuthService } from './auth.service';

  describe('AuthService', () => {
    let authService: AuthService;
    let jwtService: JwtService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: JwtService,
            useValue: {
              sign: jest.fn().mockReturnValue('mock-token'),
              verify: jest.fn().mockReturnValue({ role: 'admin' }),
            },
          },
        ],
      }).compile();
      authService = module.get<AuthService>(AuthService);
      jwtService = module.get<JwtService>(JwtService);
    });

    it('should generate a token', async () => {
      const token = await authService.generateToken('admin');
      expect(token).toBe('mock-token');
      expect(jwtService.sign).toHaveBeenCalledWith({ role: 'admin' });
    });

    it('should validate a token', async () => {
      const payload = await authService.validateToken('mock-token');
      expect(payload).toEqual({ role: 'admin' });
      expect(jwtService.verify).toHaveBeenCalledWith('mock-token');
    });

    it('should return null for invalid token', async () => {
  (jwtService.verify as jest.Mock).mockImplementation(() => {
    throw new Error('Invalid token');
  });
  const payload = await authService.validateToken('invalid-token');
  expect(payload).toBeNull();
});
  });