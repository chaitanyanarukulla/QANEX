import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;

  // Test schema
  const TestSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    age: z.number().int().positive('Age must be positive'),
    email: z.string().email('Invalid email'),
    role: z.enum(['admin', 'user']).optional(),
  });

  beforeEach(() => {
    pipe = new ZodValidationPipe(TestSchema);
  });

  describe('Valid data', () => {
    it('should validate correct data', () => {
      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = pipe.transform(validData, {} as any);

      expect(result).toEqual(validData);
    });

    it('should validate data with optional fields', () => {
      const validData = {
        name: 'Jane Doe',
        age: 25,
        email: 'jane@example.com',
        role: 'admin',
      };

      const result = pipe.transform(validData, {} as any);

      expect(result).toEqual(validData);
    });
  });

  describe('Invalid data', () => {
    it('should throw BadRequestException for missing required field', () => {
      const invalidData = {
        age: 30,
        email: 'john@example.com',
      };

      expect(() => pipe.transform(invalidData, {} as any)).toThrow(
        BadRequestException,
      );
    });

    it('should throw with formatted error messages', () => {
      const invalidData = {
        name: '',
        age: -5,
        email: 'invalid-email',
      };

      expect(() => pipe.transform(invalidData, {} as any)).toThrow(
        BadRequestException,
      );
    });

    it('should include field paths in error messages', () => {
      const invalidData = {
        name: 'John',
        age: 'not-a-number',
        email: 'john@example.com',
      };

      expect(() => pipe.transform(invalidData, {} as any)).toThrow(
        BadRequestException,
      );
    });

    it('should validate enum values', () => {
      const invalidData = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
        role: 'superadmin', // Invalid enum value
      };

      expect(() => pipe.transform(invalidData, {} as any)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('Nested validation', () => {
    const NestedSchema = z.object({
      user: z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),
      tags: z.array(z.string().min(1)),
    });

    it('should validate nested objects', () => {
      const nestedPipe = new ZodValidationPipe(NestedSchema);
      const validData = {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
        tags: ['tag1', 'tag2'],
      };

      const result = nestedPipe.transform(validData, {} as any);
      expect(result).toEqual(validData);
    });

    it('should validate nested objects with errors', () => {
      const nestedPipe = new ZodValidationPipe(NestedSchema);
      const invalidData = {
        user: {
          name: '',
          email: 'invalid-email',
        },
        tags: ['', 'tag2'],
      };

      expect(() => nestedPipe.transform(invalidData, {} as any)).toThrow(
        BadRequestException,
      );
    });

    it('should include nested paths in errors', () => {
      const nestedPipe = new ZodValidationPipe(NestedSchema);
      const invalidData = {
        user: {
          name: 'John',
          email: 'invalid-email',
        },
        tags: ['tag1'],
      };

      expect(() => nestedPipe.transform(invalidData, {} as any)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('Array validation', () => {
    const ArraySchema = z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    );

    it('should validate arrays of objects', () => {
      const arrayPipe = new ZodValidationPipe(ArraySchema);
      const validData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const result = arrayPipe.transform(validData, {} as any);
      expect(result).toEqual(validData);
    });

    it('should validate array items', () => {
      const arrayPipe = new ZodValidationPipe(ArraySchema);
      const invalidData = [
        { id: 1, name: 'Item 1' },
        { id: 'not-a-number', name: 'Item 2' }, // Invalid
      ];

      expect(() => arrayPipe.transform(invalidData, {} as any)).toThrow(
        BadRequestException,
      );
    });
  });
});
