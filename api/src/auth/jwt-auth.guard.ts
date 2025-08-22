import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";
import { AuthService } from "./auth.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private authService: AuthService) {}
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const request =context.switchToHttp().getRequest()
        const token = request.headers.authorization?.replace('Bearer', ' ');
        if (!token) return false
        const payload = this.authService.validateToken(token);
        if (!payload) return false;
        request.user = payload;
        return true;
    }
}