/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { JwtService } from '@nestjs/jwt';
import { OrgRole } from '../users/user-tenant.entity';

const mockUsersService: {
  findByEmail: jest.Mock;
  create: jest.Mock;
} = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const mockTenantsService: {
  create: jest.Mock;
} = {
  create: jest.fn(),
};

const mockJwtService: {
  sign: jest.Mock;
} = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TenantsService, useValue: mockTenantsService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should find user by email', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u1' });
      const res = await service.validateUser('test@test.com', 'sub');
      expect(res).toEqual({ id: 'u1' });
    });
  });

  describe('login', () => {
    it('should login existing user', async () => {
      const user = {
        id: 'u1',
        email: 'test@test.com',
        firstName: 'F',
        lastName: 'L',
        tenantId: 't1',
      };
      mockUsersService.findByEmail.mockResolvedValue(user);

      const res = await service.login({ email: 'test@test.com', sub: 'sub1' });

      expect(res.access_token).toBe('mock-token');
      expect(res.user.email).toBe('test@test.com');
      expect(mockTenantsService.create).not.toHaveBeenCalled();
    });

    it('should provision new user and tenant if user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      // Provision flow
      mockTenantsService.create.mockResolvedValue({ id: 't1' });
      const newUser = {
        id: 'u2',
        email: 'new@test.com',
        firstName: 'New',
        lastName: 'User',
        tenantId: 't1',
      };
      mockUsersService.create.mockResolvedValue(newUser);

      const res = await service.login({
        email: 'new@test.com',
        sub: 'sub2',
        name: 'New User',
      });

      expect(mockTenantsService.create).toHaveBeenCalled();
      expect(mockUsersService.create).toHaveBeenCalledWith(
        'new@test.com',
        'New',
        'User',
        't1',
        OrgRole.ORG_ADMIN,
      );
      expect(res.access_token).toBe('mock-token');
    });
  });
});
