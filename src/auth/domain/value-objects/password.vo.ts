export class Password {
  private readonly value: string;

  constructor(password: string) {
    if (!this.isValid(password)) {
      throw new Error(
        'Password must be at least 8 characters long, contain a special character (@$!%*?&#), a lowercase letter, an uppercase letter and a number. ',
      );
    }
    this.value = password;
  }

  private isValid(password: string): boolean {
    // Verifica requisitos de seguridad básicos y excluye caracteres SQL peligrosos
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[^;'"`\\]+$/;

    // Verifica longitud mínima
    if (password.length < 8) return false;

    // Verifica que no contenga palabras clave de SQL
    const sqlKeywords = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'DROP',
      'UNION',
    ];
    const containsSqlKeywords = sqlKeywords.some((keyword) =>
      password.toUpperCase().includes(keyword),
    );

    return passwordRegex.test(password) && !containsSqlKeywords;
  }

  toString(): string {
    return this.value;
  }
}
