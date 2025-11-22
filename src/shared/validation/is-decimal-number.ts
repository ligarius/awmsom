import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsDecimalNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsDecimalNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === null || value === undefined) {
            return false;
          }
          return typeof value === 'number' && !isNaN(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid number`;
        },
      },
    });
  };
}
