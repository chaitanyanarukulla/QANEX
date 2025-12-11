import { Request } from 'express';
import { IAuthUser } from './auth-user.interface';

export interface AuthenticatedRequest extends Request {
  user: IAuthUser;
}
