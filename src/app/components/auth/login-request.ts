export class LoginRequest {
  email = '';
  password = '';

  constructor(partial?: Partial<LoginRequest>) {
    Object.assign(this, partial);
  }
}
