import { Test, TestingModule } from "@nestjs/testing";
import { AuthResolver } from "./auth.resolver";
import { AuthService } from "./auth.service";
import { GqlAuthGuard } from "./guards/gqlAuth.guard";

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  role: "USER",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AuthResolver", () => {
  let resolver: AuthResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(GqlAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should return an AuthPayload object (not a JSON string)", async () => {
      const payload = { accessToken: "token-abc", user: mockUser };
      mockAuthService.register.mockResolvedValue(payload);

      const result = await resolver.register({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      });

      expect(result).toEqual(payload);
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("user");
    });

    it("should call authService.register with the correct args", async () => {
      mockAuthService.register.mockResolvedValue({
        accessToken: "tok",
        user: mockUser,
      });

      await resolver.register({
        email: "a@b.com",
        password: "pass1234",
        name: "Alice",
      });

      expect(mockAuthService.register).toHaveBeenCalledWith(
        "a@b.com",
        "pass1234",
        "Alice"
      );
    });
  });

  describe("login", () => {
    it("should return an AuthPayload object (not a JSON string)", async () => {
      const payload = { accessToken: "token-xyz", user: mockUser };
      mockAuthService.login.mockResolvedValue(payload);

      const result = await resolver.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result).toEqual(payload);
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("user");
    });

    it("should call authService.login with correct args", async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: "tok",
        user: mockUser,
      });

      await resolver.login({ email: "a@b.com", password: "pass1234" });

      expect(mockAuthService.login).toHaveBeenCalledWith("a@b.com", "pass1234");
    });
  });

  describe("me", () => {
    it("should return the current user object directly", async () => {
      const result = await resolver.me(mockUser);

      expect(result).toEqual(mockUser);
      expect(typeof result).toBe("object");
    });
  });
});
