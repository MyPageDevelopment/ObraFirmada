import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBase64,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class EquipmentItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  code?: string;
}

export class VerifyBiometricDto {
  @IsString()
  @IsNotEmpty()
  rut!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['FACE', 'PALM'])
  biometricType!: 'FACE' | 'PALM';

  @IsOptional()
  @ValidateIf((o: any) => !o.isException)
  @IsBase64({}, { message: 'La captura biometrica debe estar en Base64' })
  @IsNotEmpty()
  biometricImageBase64?: string;
}

export class CreateEquipmentDeliveryDto extends VerifyBiometricDto {
  @IsString()
  @IsNotEmpty()
  workerFullName!: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Debe existir al menos un implemento entregado' })
  @ValidateNested({ each: true })
  @Type(() => EquipmentItemDto)
  equipmentItems!: EquipmentItemDto[];

  @IsBase64({}, { message: 'La firma debe estar en Base64' })
  @IsNotEmpty()
  signatureBase64!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isException?: boolean;

  @IsOptional()
  @IsString()
  witnessRut?: string;

  @IsOptional()
  @IsString()
  witnessFullName?: string;

  @IsOptional()
  @IsString()
  witnessSignatureBase64?: string;
}

export class BiometricVerificationResponseDto {
  verified!: boolean;
  userId!: string;
  identityLogId!: string;
  rut!: string;
  biometricType!: 'FACE' | 'PALM';
  verifiedAt!: Date;
}

export class CreateEquipmentDeliveryResponseDto {
  equipmentDeliveryId!: string;
  documentIntegrityId!: string;
  sha256!: string;
  verified!: boolean;
  verifiedAt!: Date;
  deliveredAt!: Date;
}