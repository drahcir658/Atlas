/**
 * ATLAS - Implementação de CreateCycleUseCase
 * Cria ciclos agnósticos validando entrada, área e regras de negócio
 */

import {
  Cycle,
  CreateCycleInput,
  CycleType,
  RecordStatus,
} from '../domain/types';
import {
  ICreateCycleUseCase,
  CreateCycleUseCaseInput,
  ValidationError,
  AreaNotFoundError,
  BusinessRuleViolationError,
  PersistenceError,
} from './interfaces/ICreateCycleUseCase';
import { ICycleRepository } from '../ports/ICycleRepository';
import { IAreaRegistry } from '../ports/IAreaRegistry';
import { ILogger } from '../ports/ILogger';

/**
 * CreateCycleUseCase: Implementação do caso de uso de criação de ciclos
 *
 * Fluxo:
 * 1. Validar entrada agnóstica (title, dates, type)
 * 2. Se areaId fornecido: validar existência no registry
 * 3. Se área existe: executar validadores customizados
 * 4. Executar business rules da área (trigger: onCycleCreate)
 * 5. Criar instância Cycle (com missionIds e friendIds vazios)
 * 6. Persistir via repositório
 * 7. Retornar ciclo criado
 */
export class CreateCycleUseCase implements ICreateCycleUseCase {
  constructor(
    private cycleRepository: ICycleRepository,
    private areaRegistry: IAreaRegistry,
    private logger?: ILogger
  ) {}

  async execute(input: CreateCycleUseCaseInput): Promise<Cycle> {
    this.logger?.info('CreateCycleUseCase.execute', {
      personId: input.personId,
      title: input.title,
      areaId: input.areaId,
    });

    try {
      // ============ PASSO 1: VALIDAÇÕES AGNÓSTICAS ============
      this.validateInput(input);

      // ============ PASSO 2: VALIDAR ÁREA (SE FORNECIDA) ============
      if (input.areaId) {
        const area = this.areaRegistry.getArea(input.areaId);
        if (!area) {
          throw new AreaNotFoundError(input.areaId);
        }
        this.logger?.debug('Area found', { areaId: input.areaId, label: area.label });
      }

      // ============ PASSO 3: CRIAR INSTÂNCIA CYCLE ============
      const cycle = this.createCycleInstance(input);
      this.logger?.debug('Cycle instance created', { cycleId: cycle.id });

      // ============ PASSO 4: VALIDAR COM AREA (SE FORNECIDA) ============
      if (input.areaId) {
        await this.validateWithAreaPlugin(input.areaId, cycle);
      }

      // ============ PASSO 5: EXECUTAR BUSINESS RULES ============
      if (input.areaId) {
        await this.executeAreaBusinessRules(input.areaId, cycle);
      }

      // ============ PASSO 6: PERSISTIR ============
      const persistedCycle = await this.cycleRepository.create(cycle);
      this.logger?.info('Cycle created successfully', {
        cycleId: persistedCycle.id,
        personId: input.personId,
      });

      return persistedCycle;
    } catch (error) {
      this.logger?.error('CreateCycleUseCase.execute failed', {
        personId: input.personId,
        title: input.title,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-lançar erros de domínio como estão
      if (
        error instanceof ValidationError ||
        error instanceof AreaNotFoundError ||
        error instanceof BusinessRuleViolationError
      ) {
        throw error;
      }

      // Envolver outros erros em PersistenceError
      if (error instanceof Error) {
        throw new PersistenceError('Failed to create cycle', {
          originalError: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * VALIDAÇÃO 1: Validações agnósticas de entrada
   * Independente de área, esses campos são sempre obrigatórios
   */
  private validateInput(input: CreateCycleUseCaseInput): void {
    // Validar personId
    if (!input.personId || input.personId.trim().length === 0) {
      throw new ValidationError('personId is required', { field: 'personId' });
    }

    // Validar title
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError('title is required and must not be empty', {
        field: 'title',
      });
    }

    // Title não pode exceder 255 caracteres (conforme schema DB)
    if (input.title.length > 255) {
      throw new ValidationError('title must not exceed 255 characters', {
        field: 'title',
        maxLength: 255,
        providedLength: input.title.length,
      });
    }

    // Validar type
    if (!input.type || !Object.values(CycleType).includes(input.type)) {
      throw new ValidationError('type must be "unique" or "recurring"', {
        field: 'type',
        providedValue: input.type,
      });
    }

    // Validar startDate
    if (!input.startDate) {
      throw new ValidationError('startDate is required', { field: 'startDate' });
    }

    if (!(input.startDate instanceof Date) || isNaN(input.startDate.getTime())) {
      throw new ValidationError('startDate must be a valid Date', {
        field: 'startDate',
        providedValue: input.startDate,
      });
    }

    // startDate não pode ser no passado (assumindo que "agora" é razoável)
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Comparar apenas datas, não horários
    if (input.startDate < now) {
      throw new ValidationError('startDate cannot be in the past', {
        field: 'startDate',
        providedValue: input.startDate.toISOString(),
        currentDate: now.toISOString(),
      });
    }

    // Se type é RECURRING, pattern é obrigatório
    if (input.type === CycleType.RECURRING && !input.pattern) {
      throw new ValidationError(
        'pattern is required when type is "recurring"',
        {
          field: 'pattern',
          type: input.type,
        }
      );
    }

    // Validar pattern se fornecido
    if (input.pattern) {
      const validPatterns = [
        'daily',
        'weekly',
        'monthly',
        '90days',
        'custom',
      ];
      if (!validPatterns.includes(input.pattern)) {
        throw new ValidationError(
          'pattern must be one of: daily, weekly, monthly, 90days, custom',
          {
            field: 'pattern',
            providedValue: input.pattern,
          }
        );
      }

      // Se pattern é CUSTOM, customPattern é obrigatório
      if (input.pattern === 'custom' && !input.customPattern) {
        throw new ValidationError(
          'customPattern is required when pattern is "custom"',
          {
            field: 'customPattern',
          }
        );
      }
    }

    // Se endDate fornecido, validar
    if (input.endDate) {
      if (!(input.endDate instanceof Date) || isNaN(input.endDate.getTime())) {
        throw new ValidationError('endDate must be a valid Date', {
          field: 'endDate',
          providedValue: input.endDate,
        });
      }

      // endDate deve ser após startDate
      if (input.endDate < input.startDate) {
        throw new ValidationError('endDate must be after startDate', {
          field: 'endDate',
          startDate: input.startDate.toISOString(),
          providedEndDate: input.endDate.toISOString(),
        });
      }

      // Se type é RECURRING, endDate deve estar presente (ou customPattern)
      if (input.type === CycleType.RECURRING && !input.endDate && !input.customPattern) {
        throw new ValidationError(
          'endDate or customPattern is required for recurring cycles',
          {
            type: input.type,
          }
        );
      }
    }

    // Validar areaId se fornecido (formato string simples)
    if (input.areaId && input.areaId.trim().length === 0) {
      throw new ValidationError('areaId must not be empty', {
        field: 'areaId',
      });
    }

    this.logger?.debug('Input validation passed', { personId: input.personId });
  }

  /**
   * Cria a instância Cycle a partir do input
   * Inicializa com relacionamentos vazios (missões vêm depois)
   */
  private createCycleInstance(input: CreateCycleUseCaseInput): Omit<
    Cycle,
    'createdAt' | 'updatedAt'
  > {
    return {
      id: this.generateId(), // Gerar ID único (UUID)
      personId: input.personId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      areaId: input.areaId || undefined,
      type: input.type,
      pattern: input.pattern,
      customPattern: input.customPattern,
      startDate: input.startDate,
      endDate: input.endDate,
      expectedCompletionDate: undefined, // Usuário define depois
      status: RecordStatus.PENDING, // Sempre inicia em pending
      parentCycleId: undefined, // Subciclos criados separadamente
      missionIds: [], // Vazio: missões vêm depois
      friendIds: undefined, // Vazio: compartilhamento vem depois
      metadata: input.metadata || {}, // Pode vir vazio
    };
  }

  /**
   * VALIDAÇÃO 2: Validações específicas da área
   * Executa validadores customizados do plugin
   */
  private async validateWithAreaPlugin(
    areaId: string,
    cycle: Omit<Cycle, 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const area = this.areaRegistry.getArea(areaId);
    if (!area) return; // Já foi validado antes

    // Se área tem customFields required, validar metadata
    if (area.customFields) {
      for (const field of area.customFields) {
        if (field.required && !cycle.metadata[field.name]) {
          throw new ValidationError(
            `Required field "${field.label}" (${field.name}) is missing`,
            {
              field: field.name,
              areaId,
            }
          );
        }
      }
    }

    // Se área tem validadores customizados, executar
    if (area.validators) {
      for (const [fieldName, validator] of Object.entries(area.validators)) {
        const value = cycle.metadata[fieldName];
        if (value !== undefined && !validator(value)) {
          throw new ValidationError(
            `Field "${fieldName}" failed custom validation for area "${areaId}"`,
            {
              field: fieldName,
              areaId,
              providedValue: value,
            }
          );
        }
      }
    }

    this.logger?.debug('Area validation passed', { areaId });
  }

  /**
   * PASSO 5: Executar business rules da área
   * Gatilhos automáticos que podem modificar o ciclo ou disparar ações
   */
  private async executeAreaBusinessRules(
    areaId: string,
    cycle: Omit<Cycle, 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const area = this.areaRegistry.getArea(areaId);
    if (!area || !area.rules) return;

    // Filtrar rules com trigger "onCycleCreate"
    const createRules = area.rules.filter((rule) => rule.trigger === 'onCycleCreate');

    for (const rule of createRules) {
      try {
        this.logger?.debug('Executing business rule', {
          areaId,
          ruleId: rule.id,
        });

        // Executar regra (pode ser async)
        await rule.action(cycle, { areaId });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger?.error('Business rule failed', {
          areaId,
          ruleId: rule.id,
          error: errorMessage,
        });

        throw new BusinessRuleViolationError(rule.id, errorMessage, {
          areaId,
          cycleTitle: cycle.title,
        });
      }
    }

    this.logger?.debug('All business rules executed', { areaId });
  }

  /**
   * Gera um ID único para o ciclo (UUID v4)
   * Pode ser substituído por gerador de BD se necessário
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}
