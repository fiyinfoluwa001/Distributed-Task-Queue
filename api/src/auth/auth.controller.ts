import { Controller, Post, Body } from '@nestjs/common';
     import { AuthService } from './auth.service';

     @Controller('auth')
     export class AuthController {
       constructor(private authService: AuthService) {}

       @Post('login')
       async login(@Body() body: { role: 'admin' | 'worker' }) {
         return { token: await this.authService.generateToken(body.role) };
       }
     }