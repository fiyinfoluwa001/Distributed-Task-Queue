import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private configService: ConfigService) {}

  async notifyTaskCompleted(task: any): Promise<void> {
    await Promise.allSettled([
      this.sendWebhook(task, "task.completed"),
      this.sendEmail(task, "completed"),
    ]);
  }

  async notifyTaskFailed(task: any): Promise<void> {
    await Promise.allSettled([
      this.sendWebhook(task, "task.failed"),
      this.sendEmail(task, "failed"),
    ]);
  }

  private async sendWebhook(task: any, event: string): Promise<void> {
    if (!task.webhookUrl) return;

    const payload = {
      event,
      taskId: task.id,
      status: task.status,
      result: task.result ?? null,
      error: task.error ?? null,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(task.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook to ${task.webhookUrl} failed: HTTP ${response.status}`);
    }

    this.logger.log(`Webhook delivered for task ${task.id} (${event})`);
  }

  private async sendEmail(task: any, outcome: "completed" | "failed"): Promise<void> {
    if (!task.notifyEmail) return;
    if (!this.isSmtpConfigured()) return;

    const transporter = nodemailer.createTransport({
      host: this.configService.get("SMTP_HOST"),
      port: this.configService.get<number>("SMTP_PORT", 587),
      auth: {
        user: this.configService.get("SMTP_USER"),
        pass: this.configService.get("SMTP_PASS"),
      },
    });

    const subject =
      outcome === "completed"
        ? `Task "${task.title}" completed`
        : `Task "${task.title}" failed`;

    const text =
      outcome === "completed"
        ? `Your task "${task.title}" completed successfully.\n\nResult:\n${JSON.stringify(task.result, null, 2)}`
        : `Your task "${task.title}" failed.\n\nError: ${task.error}`;

    await transporter.sendMail({
      from: this.configService.get("SMTP_FROM", "noreply@dtq.app"),
      to: task.notifyEmail,
      subject,
      text,
    });

    this.logger.log(`Email sent to ${task.notifyEmail} for task ${task.id}`);
  }

  private isSmtpConfigured(): boolean {
    return !!(
      this.configService.get("SMTP_HOST") &&
      this.configService.get("SMTP_USER")
    );
  }
}
