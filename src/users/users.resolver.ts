import { UseGuards } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import { AuthUser } from "src/auth/auth-user.decorator";
import { AuthGuard } from "src/auth/auth.guard";
import { LoginInput, LoginOutput } from "./dtos/login.dto";
import { CreateAccountInput, CreateAccountOutput } from "./dtos/createAccount.dto";
import { UerProfileOutput, UserProfileInput } from "./dtos/userprofile.dto";
import { User } from "./entities/user.entity";
import { UserService } from "./users.service";
import { EditProfileInput, EditProfileOutput } from "./dtos/editProfile.dto";
import { VerifyEmailInput, VerifyEmailOutput } from "./dtos/verify-email.dto";
import { Role } from "src/auth/role.decorator";

@Resolver(of => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService
  ) {}

  @Mutation(returns => CreateAccountOutput)
  async createAccount(
    @Args('input') createAccountInput: CreateAccountInput
    ): Promise<CreateAccountOutput> {
      return this.userService.createAccount(createAccountInput);
  }

  @Mutation(returns => LoginOutput)
  async login(@Args('input') loginInput: LoginInput): Promise<LoginOutput> {
    return this.userService.login(loginInput);
  }

  @Query(returns => User) 
  @Role(['Any'])
  me(@AuthUser() authUser: User) {
    return authUser;
  }

  @Role(['Any'])
  @Query(returns => UerProfileOutput)
  async userProfile(@Args() userProfileInput: UserProfileInput): Promise<UerProfileOutput> {
    return this.userService.findById(userProfileInput.userId);
  }

  @Role(['Any'])
  @Mutation(returns => EditProfileOutput)
  async editProfile(
    @AuthUser() authUser: User,
    @Args('input') editProfileInput: EditProfileInput
  ): Promise<EditProfileOutput> {
    return this.userService.editProfile(authUser.id, editProfileInput);
  }

  @Mutation(returns => VerifyEmailOutput)
  verifyEmail(@Args('input') {code}: VerifyEmailInput): Promise<VerifyEmailOutput> {
    return this.userService.verifyEmail(code);
  }
}
