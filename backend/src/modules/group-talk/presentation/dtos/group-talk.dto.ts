import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class GroupTalkAttendeeDto {
  @IsString()
  @IsNotEmpty()
  rut!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  biometricType!: 'FACE' | 'PALM';

  @IsBoolean()
  @IsOptional()
  isException?: boolean;

  @IsString()
  @IsOptional()
  witnessRut?: string;

  @IsString()
  @IsOptional()
  witnessFullName?: string;

  @IsString()
  @IsOptional()
  witnessSignatureBase64?: string;
}

export class CreateGroupTalkDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  speakerName!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => GroupTalkAttendeeDto)
  attendees!: GroupTalkAttendeeDto[];
}
