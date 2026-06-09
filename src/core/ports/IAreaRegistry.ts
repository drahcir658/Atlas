/**
 * ATLAS - Interface de Registro de Áreas (Plugin System)
 * Define o contrato para gerenciar plugins de áreas
 * Agnóstico: qualquer string pode ser um ID de área
 */

import { AreaPluginConfig, Cycle, FieldDefinition, BusinessRule } from '../domain/types';

/**
 * IAreaRegistry: Porta para registro e gerenciamento de plugins de áreas
 *
 * Responsabilidades:
 * - REGISTER: Registrar novas áreas no sistema
 * - QUERY: Buscar informações de áreas registradas
 * - VALIDATE: Validar ciclos contra regras de áreas
 * - LIST: Listar todas as áreas disponíveis
 *
 * Agnósticismo:
 * - Não assume nenhuma área específica (Finance, Academia, etc.)
 * - Permite registro dinâmico de áreas customizadas
 * - Sistema é extensível sem modificação do core
 *
 * Implementações:
 * - InMemoryAreaRegistry: Registro em memória (desenvolvimento/testes)
 * - SupabaseAreaRegistry: Registro persistido em BD
 * - HybridAreaRegistry: Built-in em memória + customizadas em BD
 *
 * @example
 * const registry = new InMemoryAreaRegistry();
 * 
 * // Registrar área built-in
 * registry.register({
 *   id: 'finance',
 *   label: 'Finanças',
 *   icon: '💰',
 *   color: '#4CAF50',
 *   isPublic: true,
 *   isBuiltIn: true,
 *   customFields: [
 *     { name: 'amount', label: 'Valor', type: 'number', required: true }
 *   ]
 * });
 * 
 * // Usar em validação
 * const area = registry.getArea('finance');
 * const isValid = registry.validateForArea('finance', cycle);
 */
export interface IAreaRegistry {
  // ============ REGISTRATION ============

  /**
   * Registra uma nova área no sistema
   * Pode ser built-in ou customizada pelo usuário
   *
   * @param plugin Configuração da área a registrar
   * @throws AreaAlreadyRegisteredError se ID já existe
   * @throws InvalidPluginConfigError se config é inválida
   *
   * @example
   * registry.register({
   *   id: 'finance',
   *   label: 'Finanças',
   *   icon: '💰',
   *   color: '#4CAF50',
   *   isPublic: true
   * });
   */
  register(plugin: AreaPluginConfig): void;

  /**
   * Registra múltiplas áreas de uma vez
   * Útil para inicializar com áreas built-in
   *
   * @param plugins Array de configurações de áreas
   * @throws AreaAlreadyRegisteredError se algum ID já existe
   * @throws InvalidPluginConfigError se alguma config é inválida
   */
  registerBatch(plugins: AreaPluginConfig[]): void;

  /**
   * Desregistra uma área do sistema
   * Remove apenas áreas customizadas (built-in não podem ser removidas)
   *
   * @param areaId ID da área a remover
   * @throws AreaNotFoundError se área não existe
   * @throws CannotRemoveBuiltInError se é uma área built-in
   */
  unregister(areaId: string): void;

  // ============ QUERY ============

  /**
   * Busca uma área pelo ID
   *
   * @param areaId ID da área (ex: 'finance', 'academy', 'custom_myarea')
   * @returns Configuração da área ou undefined se não encontrada
   *
   * @example
   * const finance = registry.getArea('finance');
   * if (finance) {
   *   console.log(finance.label); // "Finanças"
   * }
   */
  getArea(areaId: string): AreaPluginConfig | undefined;

  /**
   * Lista todas as áreas registradas
   *
   * @param options Opções de filtro
   * @returns Array com todas as áreas
   *
   * @example
   * const allAreas = registry.listAreas();
   * const publicAreas = registry.listAreas({ isPublic: true });
   * const builtInOnly = registry.listAreas({ isBuiltIn: true });
   */
  listAreas(options?: AreaListOptions): AreaPluginConfig[];

  /**
   * Verifica se uma área está registrada
   *
   * @param areaId ID da área
   * @returns true se área existe, false caso contrário
   */
  hasArea(areaId: string): boolean;

  /**
   * Conta o número de áreas registradas
   *
   * @param options Opções de filtro
   * @returns Número de áreas
   */
  countAreas(options?: AreaListOptions): number;

  // ============ VALIDATION ============

  /**
   * Valida um ciclo contra as regras da área
   * Verifica campos obrigatórios e validadores customizados
   *
   * @param areaId ID da área
   * @param cycle Ciclo a validar
   * @returns true se válido, false caso contrário
   *
   * Validações executadas:
   * 1. Se areaId não encontrado: retorna true (sem validação)
   * 2. Valida customFields obrigatórios em cycle.metadata
   * 3. Executa validadores customizados da área
   *
   * @example
   * const isValid = registry.validateForArea('finance', cycle);
   * if (!isValid) {
   *   console.log('Ciclo não atende regras da área Finance');
   * }
   */
  validateForArea(areaId: string, cycle: Cycle): boolean;

  /**
   * Valida múltiplos ciclos contra uma área
   *
   * @param areaId ID da área
   * @param cycles Array de ciclos
   * @returns Array com ciclos válidos
   */
  validateCycles(areaId: string, cycles: Cycle[]): Cycle[];

  /**
   * Obtém detalhes de validação para um ciclo
   * Retorna array com erros encontrados (se houver)
   *
   * @param areaId ID da área
   * @param cycle Ciclo a validar
   * @returns Array com detalhes de erros (vazio se válido)
   *
   * @example
   * const errors = registry.getValidationErrors('finance', cycle);
   * errors.forEach(error => {
   *   console.log(`Campo ${error.field}: ${error.message}`);
   * });
   */
  getValidationErrors(areaId: string, cycle: Cycle): ValidationError[];

  // ============ METADATA ============

  /**
   * Obtém campos customizados de uma área
   *
   * @param areaId ID da área
   * @returns Array de definições de campos ou undefined
   *
   * @example
   * const fields = registry.getCustomFields('finance');
   * fields?.forEach(field => {
   *   console.log(`${field.label} (${field.type}): ${field.required ? 'obrigatório' : 'opcional'}`);
   * });
   */
  getCustomFields(areaId: string): FieldDefinition[] | undefined;

  /**
   * Obtém business rules de uma área
   *
   * @param areaId ID da área
   * @param trigger Filtrar por trigger específico (opcional)
   * @returns Array de regras de negócio
   *
   * @example
   * const rules = registry.getBusinessRules('finance', 'onCycleCreate');
   * rules.forEach(rule => {
   *   console.log(`Regra ${rule.id} será executada ao criar ciclo`);
   * });
   */
  getBusinessRules(areaId: string, trigger?: string): BusinessRule[];

  /**
   * Obtém validadores customizados de uma área
   *
   * @param areaId ID da área
   * @returns Objeto com funções validadoras
   */
  getValidators(
    areaId: string
  ): Record<string, (value: unknown) => boolean> | undefined;

  // ============ UTILITIES ============

  /**
   * Verifica se uma área é pública (suporta ciclos públicos)
   *
   * @param areaId ID da área
   * @returns true se área é pública
   */
  isPublic(areaId: string): boolean;

  /**
   * Verifica se uma área é built-in (vem com o sistema)
   *
   * @param areaId ID da área
   * @returns true se é built-in
   */
  isBuiltIn(areaId: string): boolean;

  /**
   * Obtém todas as áreas públicas
   * Usadas para ciclos públicos (Café Atlas, Leitura Coletiva, etc.)
   *
   * @returns Array de áreas públicas
   */
  getPublicAreas(): AreaPluginConfig[];

  /**
   * Obtém todas as áreas built-in
   *
   * @returns Array de áreas built-in
   */
  getBuiltInAreas(): AreaPluginConfig[];

  /**
   * Obtém todas as áreas customizadas (não built-in)
   *
   * @returns Array de áreas customizadas
   */
  getCustomAreas(): AreaPluginConfig[];

  /**
   * Export de todas as áreas para persistência
   * Útil para backup ou sincronização
   *
   * @returns JSON com todas as áreas
   */
  export(): AreaRegistryExport;

  /**
   * Import de áreas de um export anterior
   * Permite carregar áreas customizadas
   *
   * @param data Dados exportados
   * @throws InvalidExportDataError se formato inválido
   */
  import(data: AreaRegistryExport): void;

  /**
   * Limpa o registry (remove todas as áreas)
   * CUIDADO: Operação irreversível (a menos que tenha backup via export)
   */
  clear(): void;
}

/**
 * AreaListOptions: Opções para listar áreas
 */
export interface AreaListOptions {
  isPublic?: boolean; // Apenas áreas públicas
  isBuiltIn?: boolean; // Apenas built-in ou apenas customizadas
}

/**
 * ValidationError: Detalhes de erro de validação
 */
export interface ValidationError {
  field: string; // Nome do campo que falhou
  message: string; // Mensagem de erro
  value?: unknown; // Valor que falhou na validação
  expectedType?: string; // Tipo esperado
  validator?: string; // Nome do validador que falhou
}

/**
 * AreaRegistryExport: Estrutura para export/import de áreas
 */
export interface AreaRegistryExport {
  version: string; // Versão do formato
  timestamp: string; // Quando foi exportado
  areas: AreaPluginConfig[];
  metadata?: Record<string, unknown>;
}

// ============ ERROR CLASSES ============

/**
 * AreaRegistryError: Erro genérico de registry
 */
export class AreaRegistryError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AreaRegistryError';
  }
}

/**
 * AreaNotFoundError: Área não encontrada
 */
export class AreaNotFoundError extends AreaRegistryError {
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
 * AreaAlreadyRegisteredError: Área já existe
 */
export class AreaAlreadyRegisteredError extends AreaRegistryError {
  constructor(areaId: string) {
    super(
      'AREA_ALREADY_REGISTERED',
      `Area '${areaId}' is already registered`,
      { areaId }
    );
    this.name = 'AreaAlreadyRegisteredError';
  }
}

/**
 * InvalidPluginConfigError: Configuração inválida
 */
export class InvalidPluginConfigError extends AreaRegistryError {
  constructor(areaId: string, message: string) {
    super(
      'INVALID_PLUGIN_CONFIG',
      `Invalid plugin config for area '${areaId}': ${message}`,
      { areaId }
    );
    this.name = 'InvalidPluginConfigError';
  }
}

/**
 * CannotRemoveBuiltInError: Não pode remover área built-in
 */
export class CannotRemoveBuiltInError extends AreaRegistryError {
  constructor(areaId: string) {
    super(
      'CANNOT_REMOVE_BUILTIN',
      `Cannot remove built-in area '${areaId}'`,
      { areaId }
    );
    this.name = 'CannotRemoveBuiltInError';
  }
}

/**
 * InvalidExportDataError: Dados de export inválidos
 */
export class InvalidExportDataError extends AreaRegistryError {
  constructor(message: string) {
    super('INVALID_EXPORT_DATA', `Invalid export data: ${message}`);
    this.name = 'InvalidExportDataError';
  }
}
