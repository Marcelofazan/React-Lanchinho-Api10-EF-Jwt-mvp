export class ValidationSystem {
  constructor() {
    this.rules = new Map();
    this.customMessages = new Map();
    this.asyncValidators = new Map();
  }

  // Registrar regras de validação
  addRule(field, ruleName, validator, message) {
    if (!this.rules.has(field)) {
      this.rules.set(field, new Map());
    }
    this.rules.get(field).set(ruleName, { validator, message });
  }

  // Registrar validadores assíncronos (ex: verificar se email existe)
  addAsyncRule(field, ruleName, asyncValidator, message) {
    if (!this.asyncValidators.has(field)) {
      this.asyncValidators.set(field, new Map());
    }
    this.asyncValidators.get(field).set(ruleName, { validator: asyncValidator, message });
  }

  // Validar um campo específico
  validateField(field, value, allValues = {}) {
    const errors = [];
    const fieldRules = this.rules.get(field);
    
    if (!fieldRules) return errors;

    for (const [ruleName, { validator, message }] of fieldRules) {
      try {
        const isValid = validator(value, allValues);
        if (!isValid) {
          errors.push(this.formatMessage(message, field, value, ruleName));
        }
      } catch (error) {
        console.error(`Erro na validação da regra ${ruleName} para campo ${field}:`, error);
        errors.push(`Erro de validação interno para ${field}`);
      }
    }

    return errors;
  }

  // Validar todos os campos
  validateAll(values) {
    const errors = {};
    
    for (const [field, value] of Object.entries(values)) {
      const fieldErrors = this.validateField(field, value, values);
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Validação assíncrona
  async validateFieldAsync(field, value, allValues = {}) {
    const errors = [];
    
    // Primeiro, executar validações síncronas
    const syncErrors = this.validateField(field, value, allValues);
    errors.push(...syncErrors);
    
    // Se há erros síncronos, não executar validações assíncronas
    if (syncErrors.length > 0) {
      return errors;
    }

    const asyncRules = this.asyncValidators.get(field);
    if (!asyncRules) return errors;

    for (const [ruleName, { validator, message }] of asyncRules) {
      try {
        const isValid = await validator(value, allValues);
        if (!isValid) {
          errors.push(this.formatMessage(message, field, value, ruleName));
        }
      } catch (error) {
        console.error(`Erro na validação assíncrona da regra ${ruleName} para campo ${field}:`, error);
        errors.push(`Erro de validação assíncrona para ${field}`);
      }
    }

    return errors;
  }

  // Formatar mensagens de erro
  formatMessage(message, field, value, ruleName) {
    return message
      .replace('{field}', field)
      .replace('{value}', value)
      .replace('{rule}', ruleName);
  }

  // Limpar todas as regras
  clear() {
    this.rules.clear();
    this.asyncValidators.clear();
    this.customMessages.clear();
  }
}

// Validadores predefinidos
export const Validators = {
  required: (value) => {
    return value !== null && value !== undefined && String(value).trim() !== '';
  },

  minLength: (min) => (value) => {
    return !value || String(value).length >= min;
  },

  maxLength: (max) => (value) => {
    return !value || String(value).length <= max;
  },

  email: (value) => {
    if (!value) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  phone: (value) => {
    if (!value) return true;
    const phoneNumbers = String(value).replace(/\D/g, "");
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) return false;
    
    const ddd = parseInt(phoneNumbers.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    
    if (phoneNumbers.length === 11) return phoneNumbers.charAt(2) === '9';
    if (phoneNumbers.length === 10) return phoneNumbers.charAt(2) !== '9';
    
    return false;
  },

  cpf: (value) => {
    if (!value) return true;
    const cpf = String(value).replace(/\D/g, "");
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return parseInt(cpf.charAt(9)) === digit1 && parseInt(cpf.charAt(10)) === digit2;
  },

  strongPassword: (value) => {
    if (!value) return true;
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const minLength = value.length >= 8;
    
    return hasLower && hasUpper && hasNumber && hasSpecial && minLength;
  },

  match: (fieldToMatch) => (value, allValues) => {
    return value === allValues[fieldToMatch];
  },

  pattern: (regex) => (value) => {
    if (!value) return true;
    return regex.test(value);
  },

  numeric: (value) => {
    if (!value) return true;
    return /^\d+(\.\d+)?$/.test(String(value));
  },

  positiveNumber: (value) => {
    if (!value) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  },

  url: (value) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  dateRange: (minDate, maxDate) => (value) => {
    if (!value) return true;
    const date = new Date(value);
    const min = new Date(minDate);
    const max = new Date(maxDate);
    return date >= min && date <= max;
  }
};

// Validadores assíncronos predefinidos
export const AsyncValidators = {
  emailExists: async (email) => {
    try {
      const response = await fetch(`/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      return !data.exists;
    } catch {
      return true; // Em caso de erro, assumir que é válido
    }
  },

  phoneExists: async (phone) => {
    try {
      const response = await fetch(`/api/auth/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      return !data.exists;
    } catch {
      return true;
    }
  }
};

// Mensagens de erro padrão em português
export const DefaultMessages = {
  required: 'O campo {field} é obrigatório.',
  minLength: 'O campo {field} deve ter pelo menos {min} caracteres.',
  maxLength: 'O campo {field} deve ter no máximo {max} caracteres.',
  email: 'Digite um email válido.',
  phone: 'Digite um telefone válido com DDD.',
  cpf: 'Digite um CPF válido.',
  strongPassword: 'A senha deve conter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
  match: 'Os campos não coincidem.',
  pattern: 'O formato do campo {field} é inválido.',
  numeric: 'Digite apenas números.',
  positiveNumber: 'Digite um número maior que zero.',
  url: 'Digite uma URL válida.',
  dateRange: 'A data deve estar dentro do intervalo permitido.',
  emailExists: 'Este email já está em uso.',
  phoneExists: 'Este telefone já está em uso.'
};

// Factory para criar um sistema de validação pré-configurado para formulários comuns
export class FormValidatorFactory {
  static createLoginValidator() {
    const validator = new ValidationSystem();
    
    validator.addRule('email', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('email', 'email', Validators.email, DefaultMessages.email);
    validator.addRule('senha', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('senha', 'minLength', Validators.minLength(6), 'A senha deve ter pelo menos 6 caracteres.');
    
    return validator;
  }

  static createRegisterValidator() {
    const validator = new ValidationSystem();
    
    // Nome
    validator.addRule('nome', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('nome', 'minLength', Validators.minLength(2), 'O nome deve ter pelo menos 2 caracteres.');
    validator.addRule('nome', 'maxLength', Validators.maxLength(100), 'O nome deve ter no máximo 100 caracteres.');
    
    // Email
    validator.addRule('email', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('email', 'email', Validators.email, DefaultMessages.email);
    validator.addAsyncRule('email', 'emailExists', AsyncValidators.emailExists, DefaultMessages.emailExists);
    
    // Telefone
    validator.addRule('telefone', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('telefone', 'phone', Validators.phone, DefaultMessages.phone);
    validator.addAsyncRule('telefone', 'phoneExists', AsyncValidators.phoneExists, DefaultMessages.phoneExists);
    
    // Endereço
    validator.addRule('endereco', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('endereco', 'minLength', Validators.minLength(5), 'O endereço deve ter pelo menos 5 caracteres.');
    validator.addRule('endereco', 'maxLength', Validators.maxLength(300), 'O endereço deve ter no máximo 300 caracteres.');
    
    // Senha
    validator.addRule('senha', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('senha', 'minLength', Validators.minLength(6), 'A senha deve ter pelo menos 6 caracteres.');
    
    // Confirmar senha
    validator.addRule('confirmarSenha', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('confirmarSenha', 'match', Validators.match('senha'), 'As senhas não coincidem.');
    
    return validator;
  }

  static createProductValidator() {
    const validator = new ValidationSystem();
    
    validator.addRule('nome', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('nome', 'minLength', Validators.minLength(2), 'O nome do produto deve ter pelo menos 2 caracteres.');
    validator.addRule('nome', 'maxLength', Validators.maxLength(150), 'O nome do produto deve ter no máximo 150 caracteres.');
    
    validator.addRule('descricao', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('descricao', 'minLength', Validators.minLength(10), 'A descrição deve ter pelo menos 10 caracteres.');
    validator.addRule('descricao', 'maxLength', Validators.maxLength(500), 'A descrição deve ter no máximo 500 caracteres.');
    
    validator.addRule('categoria', 'required', Validators.required, DefaultMessages.required);
    
    validator.addRule('preco', 'required', Validators.required, DefaultMessages.required);
    validator.addRule('preco', 'positiveNumber', Validators.positiveNumber, 'O preço deve ser maior que zero.');
    
    return validator;
  }
}

// Hook personalizado para usar com React
export const useValidation = (validatorType = 'custom', customValidator = null) => {
  const [errors, setErrors] = React.useState({});
  const [isValidating, setIsValidating] = React.useState({});
  
  const validator = React.useMemo(() => {
    if (customValidator) return customValidator;
    
    switch (validatorType) {
      case 'login':
        return FormValidatorFactory.createLoginValidator();
      case 'register':
        return FormValidatorFactory.createRegisterValidator();
      case 'product':
        return FormValidatorFactory.createProductValidator();
      default:
        return new ValidationSystem();
    }
  }, [validatorType, customValidator]);

  const validateField = React.useCallback(async (field, value, allValues = {}) => {
    setIsValidating(prev => ({ ...prev, [field]: true }));
    
    try {
      const fieldErrors = await validator.validateFieldAsync(field, value, allValues);
      
      setErrors(prev => ({
        ...prev,
        [field]: fieldErrors.length > 0 ? fieldErrors : undefined
      }));
      
      return fieldErrors.length === 0;
    } finally {
      setIsValidating(prev => ({ ...prev, [field]: false }));
    }
  }, [validator]);

  const validateAll = React.useCallback(async (values) => {
    setIsValidating(
      Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
    
    try {
      const syncResult = validator.validateAll(values);
      let finalErrors = { ...syncResult.errors };
      
      // Executar validações assíncronas apenas para campos sem erros síncronos
      for (const [field, value] of Object.entries(values)) {
        if (!syncResult.errors[field]) {
          const asyncErrors = await validator.validateFieldAsync(field, value, values);
          if (asyncErrors.length > 0) {
            finalErrors[field] = asyncErrors;
          }
        }
      }
      
      setErrors(finalErrors);
      
      return {
        isValid: Object.keys(finalErrors).length === 0,
        errors: finalErrors
      };
    } finally {
      setIsValidating({});
    }
  }, [validator]);

  const clearErrors = React.useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = React.useCallback((field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    errors,
    isValidating,
    validateField,
    validateAll,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0,
    getFieldError: (field) => errors[field]?.[0] || null,
    isFieldValid: (field) => !errors[field] || errors[field].length === 0
  };
};

export default ValidationSystem;