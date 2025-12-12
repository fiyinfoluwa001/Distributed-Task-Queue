import { Resolver, Mutation, Args, Query } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GqlAuthGuard } from "./guards/gqlAuth.guard";
import { CurrentUser } from "./decorators/currentUser.decorator";

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => String)
  async register(
    @Args("input") input: { email: string; password: string; name?: string }
  ) {
    const result = await this.authService.register(
      input.email,
      input.password,
      input.name
    );
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  async login(@Args("input") input: { email: string; password: string }) {
    const result = await this.authService.login(input.email, input.password);
    return JSON.stringify(result);
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: any) {
    return JSON.stringify(user);
  }
}
