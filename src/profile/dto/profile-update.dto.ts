import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProfileUpdateDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  login?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar_url?: string;
}
