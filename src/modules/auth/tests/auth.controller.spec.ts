import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController routes', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(() => {
    service = {
      health: jest.fn(),
      login: jest.fn(),
      oauthLogin: jest.fn(),
      buildOAuthAuthorizeUrl: jest.fn(),
      enrollFactor: jest.fn(),
      verifyMfa: jest.fn(),
      register: jest.fn(),
      getAuthenticatedUser: jest.fn(),
      listUsers: jest.fn(),
      findUser: jest.fn(),
      updateCredentials: jest.fn(),
      deactivateUser: jest.fn(),
      deleteUser: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    controller = new AuthController(service);
  });

  it('delegates to service when listing users by tenant', async () => {
    service.listUsers.mockResolvedValueOnce([
      { id: '1', email: 'a', tenantId: 't1', isActive: true, fullName: 'User A' },
    ]);

    const result = await controller.listUsers('t1');

    expect(service.listUsers).toHaveBeenCalledWith('t1');
    expect(result).toHaveLength(1);
  });

  it('delegates deactivation and deletion to service', async () => {
    service.deactivateUser.mockResolvedValueOnce({
      id: '1',
      email: 'a',
      tenantId: 't1',
      isActive: false,
      fullName: 'User A',
    });
    service.deleteUser.mockResolvedValueOnce({
      id: '2',
      email: 'b',
      tenantId: 't1',
      isActive: true,
      fullName: 'User B',
    });

    const deactivated = await controller.deactivateUser('1');
    const deleted = await controller.deleteUser('2');

    expect(service.deactivateUser).toHaveBeenCalledWith('1');
    expect(service.deleteUser).toHaveBeenCalledWith('2');
    expect(deactivated.isActive).toBe(false);
    expect(deleted.id).toBe('2');
  });

  it('returns the authenticated user for /auth/me', async () => {
    const user = { id: '1', email: 'user@example.com', tenantId: 't1', fullName: 'User', roles: [] } as any;
    service.getAuthenticatedUser.mockResolvedValueOnce(user);

    const result = await controller.me({ headers: { authorization: 'Bearer token' }, user } as any);

    expect(service.getAuthenticatedUser).toHaveBeenCalledWith('Bearer token', user);
    expect(result).toEqual(user);
  });
});
