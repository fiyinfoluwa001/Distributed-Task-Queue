import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotificationsService } from "./notifications.service";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn() }),
}));

// Access via requireMock so we get the already-mocked module
const nodemailerMock = jest.requireMock("nodemailer");
const getMockSendMail = (): jest.Mock =>
  nodemailerMock.createTransport().sendMail;

const baseTask = {
  id: "task-1",
  title: "Test Task",
  status: "COMPLETED",
  result: { processedAt: "2026-01-01" },
  error: null,
  webhookUrl: "https://example.com/webhook",
  notifyEmail: "user@example.com",
};

describe("NotificationsService", () => {
  let service: NotificationsService;
  let configGet: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn((key: string, def?: any) => {
      const config: Record<string, any> = {
        SMTP_HOST: "smtp.example.com",
        SMTP_USER: "sender@example.com",
        SMTP_PASS: "password",
        SMTP_FROM: "noreply@dtq.app",
        SMTP_PORT: 587,
      };
      return config[key] ?? def;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
    getMockSendMail().mockResolvedValue({ messageId: "test-id" });
  });

  describe("webhook delivery", () => {
    it("should POST to webhookUrl with task.completed event on success", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true } as Response);

      await service.notifyTaskCompleted(baseTask);

      expect(fetchSpy).toHaveBeenCalledWith(baseTask.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"event":"task.completed"'),
      });
      fetchSpy.mockRestore();
    });

    it("should POST to webhookUrl with task.failed event on failure", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true } as Response);

      const failedTask = {
        ...baseTask,
        status: "FAILED",
        error: "boom",
        result: null,
      };
      await service.notifyTaskFailed(failedTask);

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string
      );
      expect(body.event).toBe("task.failed");
      expect(body.taskId).toBe("task-1");
      fetchSpy.mockRestore();
    });

    it("should include taskId, status, result, and timestamp in webhook payload", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true } as Response);

      await service.notifyTaskCompleted(baseTask);

      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string
      );
      expect(body).toMatchObject({
        event: "task.completed",
        taskId: "task-1",
        status: "COMPLETED",
        result: baseTask.result,
      });
      expect(body.timestamp).toBeDefined();
      fetchSpy.mockRestore();
    });

    it("should skip webhook when webhookUrl is not set", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue({ ok: true } as Response);

      await service.notifyTaskCompleted({ ...baseTask, webhookUrl: null });

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("should not throw when webhook delivery fails — allSettled absorbs errors", async () => {
      jest
        .spyOn(global, "fetch")
        .mockRejectedValue(new Error("network error"));

      await expect(
        service.notifyTaskCompleted(baseTask)
      ).resolves.not.toThrow();
    });
  });

  describe("email delivery", () => {
    it("should send email to notifyEmail when SMTP is configured", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);

      await service.notifyTaskCompleted(baseTask);

      expect(getMockSendMail()).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: expect.stringContaining("Test Task"),
        })
      );
    });

    it("should mention 'completed' in subject when task succeeded", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);

      await service.notifyTaskCompleted(baseTask);

      const mail = getMockSendMail().mock.calls[0][0];
      expect(mail.subject.toLowerCase()).toContain("completed");
    });

    it("should mention 'failed' in subject when task failed", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);

      await service.notifyTaskFailed({
        ...baseTask,
        status: "FAILED",
        error: "oops",
      });

      const mail = getMockSendMail().mock.calls[0][0];
      expect(mail.subject.toLowerCase()).toContain("failed");
    });

    it("should skip email when notifyEmail is not set", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);

      await service.notifyTaskCompleted({ ...baseTask, notifyEmail: null });

      expect(getMockSendMail()).not.toHaveBeenCalled();
    });

    it("should skip email when SMTP_HOST is not configured", async () => {
      configGet.mockReturnValue(undefined); // all env vars missing
      jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);

      await service.notifyTaskCompleted(baseTask);

      expect(getMockSendMail()).not.toHaveBeenCalled();
    });
  });
});
