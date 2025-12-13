import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";

export class LoginInput {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RegisterInput {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  name?: string;
}
