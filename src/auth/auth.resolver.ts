import { Resolver, Mutation, Args, Query } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GqlAuthGuard } from "./guards/gqlAuth.guard";
import { CurrentUser } from "./decorators/currentUser.decorator";
import { LoginInput, RegisterInput } from "../graphql/dto/auth.input";

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation("register")
  async register(@Args("input") input: RegisterInput) {
    return this.authService.register(input.email, input.password, input.name);
  }

  @Mutation("login")
  async login(@Args("input") input: LoginInput) {
    return this.authService.login(input.email, input.password);
  }

  @Query("me")
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: any) {
    return user;
  }
}
