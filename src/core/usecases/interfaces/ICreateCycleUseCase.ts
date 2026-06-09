/**
 * ATLAS - Contrato de CreateCycleUseCase
 * Define a interface para o usecase de criação de ciclos
 * Agnóstico de domínio: funciona com qualquer área
 */

import { Cycle, CreateCycleInput } from '../../domain/types';

/**
 * ICreateCycleUseCase: Contrato para criação de ciclos
 * 
 * Responsabilidades:
 * 1. Validar entrada agnóstica (title, dates, type)
 * 2. Validar com regras da área (se fornecida)
 * 3. Executar business rules da área (onCycleCreate)
 * 4. Persistir ciclo vazio (sem missões, sem registros)
 * 5. Retornar ciclo criado com ID
 * 
 * Casos de uso:
 * - Criar ciclo único simples (título + datas)
 * - Criar ciclo recorrente (com padrão)
 * - Criar ciclo em área específica (Finance, Academia, etc.)
 * - Criar ciclo público (sem área)
 * 
 * @example
 * const usecase = new CreateCycleUseCase(cycleRepository, areaRegistry, logger);
 * const cycle = await usecase.execute({
 *   personId: 'user-123',
 *   title: 'Lançar Produto',
 *   areaId: 'finance',
 *   type: 'unique',
 *   startDate: new Date(),
 *   metadata: { budget: 5000 }
 * });
 */
export interface ICreateCycleUseCase {
  /**
   * Executa a criação de um ciclo
   * 
   * @param input Dados de entrada agnósticos + personId
   * @returns Ciclo criado com ID, timestamps e relacionamentos vazios
   * @throws DomainError se validação falhar
   * @throws AreaNotFoundError se areaId fornecido não existe
   * @throws BusinessRuleViolationError se regra da área falhar
   */
  execute(input: CreateCycleUseCaseInput): Promise<Cycle>;
}

/**
 * CreateCycleUseCaseInput: DTO de entrada para o usecase
 * Estende CreateCycleInput com personId (identificação de quem criou)
 */
export interface CreateCycleUseCaseInput extends CreateCycleInput {
  /**
   * ID da pessoa criando o ciclo
   * Obrigatório: todo ciclo pertence a alguém
   */
  personId: string;
}

/**
 * Tipos de erro específicos do usecase
 * Usados para tratamento granular em handlers
 */

/**
 * Erro genérico de domínio
 * Base para todos os erros de negócio
 */
export class DomainError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

/**
 * Erro de validação de entrada
 * Exemplos: título vazio, data inválida, padrão desconhecido
 */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Erro de área não encontrada
 * Lançado quando areaId fornecido não está registrado
 */
export class AreaNotFoundError extends DomainError {
  constructor(areaId: string) {
    super(
      'AREA_NOT_FOUND',
      `Area '${areaId}' is not registered in the system`,
      { areaId }
    );
    this.name = 'AreaNotFoundError';
  }
}

/**
 * Erro de violação de regra de negócio
 * Lançado quando uma BusinessRule da área falha
 */
export class BusinessRuleViolationError extends DomainError {
  constructor(
    ruleId: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(
      'BUSINESS_RULE_VIOLATION',
      `Business rule '${ruleId}' failed: ${message}`,
      details
    );
    this.name = 'BusinessRuleViolationError';
  }
}

/**
 * Erro de persistência
 * Lançado quando falha ao salvar no banco
 */
export class PersistenceError extends DomainError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super('PERSISTENCE_ERROR', message, details);
    this.name = 'PersistenceError';
  }
}
