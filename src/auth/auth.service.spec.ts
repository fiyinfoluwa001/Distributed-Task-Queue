import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";

jest.mock("bcrypt");

const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue("signed-token"),
};

const hashedPassword = "$2b$10$hashedpassword";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should hash password and return accessToken + user", async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      const createdUser = {
        id: "u1",
        email: "a@b.com",
        password: hashedPassword,
        name: "Alice",
        role: "USER",
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register("a@b.com", "plainpass", "Alice");

      expect(bcrypt.hash).toHaveBeenCalledWith("plainpass", 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email: "a@b.com", password: hashedPassword, name: "Alice" },
      });
      expect(result).toHaveProperty("accessToken", "signed-token");
      expect(result).toHaveProperty("user", createdUser);
    });
  });

  describe("login", () => {
    it("should return accessToken + user when credentials are valid", async () => {
      const user = {
        id: "u1",
        email: "a@b.com",
        password: hashedPassword,
        role: "USER",
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login("a@b.com", "plainpass");

      expect(result).toHaveProperty("accessToken", "signed-token");
      expect(result).toHaveProperty("user", user);
    });

    it("should throw UnauthorizedException when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login("x@y.com", "pass")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should throw UnauthorizedException when password is wrong", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        password: hashedPassword,
        role: "USER",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login("a@b.com", "wrongpass")).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
