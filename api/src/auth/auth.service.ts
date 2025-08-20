import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) {}
    async generateToken(role: 'admin' | 'worker') {
        const payload = {role};
        return this.jwtService.sign(payload)
    }
    async validateToken(token: string) {
        try {
            return this.jwtService.verify(token);
        }   catch {
            return null;
        }
    }
}