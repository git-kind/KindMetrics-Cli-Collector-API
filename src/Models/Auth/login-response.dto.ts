import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({ format: 'uuid' })
  guid!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isPlatformAdmin!: boolean;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 900 })
  expiresIn!: number;

  @ApiProperty({ type: LoginUserDto })
  user!: LoginUserDto;
}