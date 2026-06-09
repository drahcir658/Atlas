/**
 * ATLAS - Implementação In-Memory do Registro de Áreas
 * Armazena áreas em memória (Map)
 * Ideal para desenvolvimento, testes e uso offline
 * Pode ser estendida para persistência posterior
 */

import {
  IAreaRegistry,
  AreaListOptions,
  ValidationError as RegistryValidationError,
  AreaRegistryExport,
  AreaNotFoundError,
  AreaAlreadyRegisteredError,
  InvalidPluginConfigError,
  CannotRemoveBuiltInError,
  InvalidExportDataError,
} from '../ports/IAreaRegistry';
import { AreaPluginConfig, Cycle } from '../domain/types';

/**
 * InMemoryAreaRegistry: Implementação em memória do registro de áreas
 *
 * Características:
 * - Rápido: sem I/O, tudo em memória
 * - Simples: ideal para desenvolvimento e testes
 * - Extensível: pode ser substituído por implementação com persistência
 * - Validação completa: verifica config, duplicatas, tipos
 *
 * Uso:
 * const registry = new InMemoryAreaRegistry();
 * registry.register({ id: 'finance', ... });
 * const area = registry.getArea('finance');
 */
export class InMemoryAreaRegistry implements IAreaRegistry {
  private areas: Map<string, AreaPluginConfig> = new Map();

  constructor() {
    // Inicializar vazio, aguardando registração de áreas
    // (pode ser estendido para carregar built-ins automaticamente)
  }

  // ============ REGISTRATION ============

  register(plugin: AreaPluginConfig): void {
    // Validar configuração
    this.validatePluginConfig(plugin);

    // Verificar duplicata
    if (this.areas.has(plugin.id)) {
      throw new AreaAlreadyRegisteredError(plugin.id);
    }

    // Registrar
    this.areas.set(plugin.id, { ...plugin });
  }

  registerBatch(plugins: AreaPluginConfig[]): void {
    for (const plugin of plugins) {
      this.register(plugin);
    }
  }

  unregister(areaId: string): void {
    const area = this.areas.get(areaId);

    // Verificar existência
    if (!area) {
      throw new AreaNotFoundError(areaId);
    }

    // Não permitir remover built-in
    if (area.isBuiltIn) {
      throw new CannotRemoveBuiltInError(areaId);
    }

    // Remover
    this.areas.delete(areaId);
  }

  // ============ QUERY ============

  getArea(areaId: string): AreaPluginConfig | undefined {
    return this.areas.get(areaId);
  }

  listAreas(options?: AreaListOptions): AreaPluginConfig[] {
    const result: AreaPluginConfig[] = [];

    for (const area of this.areas.values()) {
      // Filtrar por isPublic se especificado
      if (options?.isPublic !== undefined && area.isPublic !== options.isPublic) {
        continue;
      }

      // Filtrar por isBuiltIn se especificado
      if (options?.isBuiltIn !== undefined && area.isBuiltIn !== options.isBuiltIn) {
        continue;
      }

      result.push(area);
    }

    return result;
  }

  hasArea(areaId: string): boolean {
    return this.areas.has(areaId);
  }

  countAreas(options?: AreaListOptions): number {
    return this.listAreas(options).length;
  }

  // ============ VALIDATION ============

  validateForArea(areaId: string, cycle: Cycle): boolean {
    const errors = this.getValidationErrors(areaId, cycle);
    return errors.length === 0;
  }

  validateCycles(areaId: string, cycles: Cycle[]): Cycle[] {
    return cycles.filter((cycle) => this.validateForArea(areaId, cycle));
  }

  getValidationErrors(areaId: string, cycle: Cycle): RegistryValidationError[] {
    const area = this.areas.get(areaId);
    const errors: RegistryValidationError[] = [];

    // Se área não encontrada, não valida (sem erro)
    if (!area) {
      return errors;
    }

    // ========== VALIDAÇÃO 1: Campos obrigatórios ==========
    if (area.customFields) {
      for (const field of area.customFields) {
        if (field.required) {
          const value = cycle.metadata[field.name];

          if (value === undefined || value === null || value === '') {
            errors.push({
              field: field.name,
              message: `Required field "${field.label}" is missing`,
              expectedType: field.type,
              value: value,
            });
          }
        }
      }
    }

    // ========== VALIDAÇÃO 2: Validadores customizados ==========
    if (area.validators) {
      for (const [fieldName, validator] of Object.entries(area.validators)) {
        const value = cycle.metadata[fieldName];

        // Validadores só funcionam se valor está presente
        if (value !== undefined && value !== null) {
          try {
            const isValid = validator(value);

            if (!isValid) {
              errors.push({
                field: fieldName,
                message: `Field "${fieldName}" failed custom validation`,
                value: value,
                validator: fieldName,
              });
            }
          } catch (error) {
            // Se validador lança exceção, é erro de validação
            errors.push({
              field: fieldName,
              message: `Validator error: ${error instanceof Error ? error.message : String(error)}`,
              value: value,
              validator: fieldName,
            });
          }
        }
      }
    }

    return errors;
  }

  // ============ METADATA ============

  getCustomFields(areaId: string) {
    const area = this.areas.get(areaId);
    return area?.customFields;
  }

  getBusinessRules(areaId: string, trigger?: string) {
    const area = this.areas.get(areaId);
    if (!area?.rules) return [];

    if (trigger) {
      return area.rules.filter((rule) => rule.trigger === trigger);
    }

    return area.rules;
  }

  getValidators(areaId: string) {
    const area = this.areas.get(areaId);
    return area?.validators;
  }

  // ============ UTILITIES ============

  isPublic(areaId: string): boolean {
    const area = this.areas.get(areaId);
    return area?.isPublic ?? false;
  }

  isBuiltIn(areaId: string): boolean {
    const area = this.areas.get(areaId);
    return area?.isBuiltIn ?? false;
  }

  getPublicAreas(): AreaPluginConfig[] {
    return this.listAreas({ isPublic: true });
  }

  getBuiltInAreas(): AreaPluginConfig[] {
    return this.listAreas({ isBuiltIn: true });
  }

  getCustomAreas(): AreaPluginConfig[] {
    return this.listAreas({ isBuiltIn: false });
  }

  export(): AreaRegistryExport {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      areas: Array.from(this.areas.values()),
      metadata: {
        totalAreas: this.areas.size,
        builtInCount: this.getBuiltInAreas().length,
        customCount: this.getCustomAreas().length,
      },
    };
  }

  import(data: AreaRegistryExport): void {
    // Validar estrutura
    if (!data.version || !Array.isArray(data.areas)) {
      throw new InvalidExportDataError('Missing required fields: version, areas');
    }

    // Validar compatibilidade de versão
    if (!data.version.startsWith('1.')) {
      throw new InvalidExportDataError(
        `Incompatible version: ${data.version}. Expected 1.x.x`
      );
    }

    // Limpar áreas customizadas (manter built-in)
    const builtInIds = new Set(
      this.getBuiltInAreas().map((area) => area.id)
    );
    for (const areaId of this.areas.keys()) {
      if (!builtInIds.has(areaId)) {
        this.areas.delete(areaId);
      }
    }

    // Importar novas áreas
    for (const areaConfig of data.areas) {
      // Pular built-in se já existe
      if (builtInIds.has(areaConfig.id)) {
        continue;
      }

      try {
        this.register(areaConfig);
      } catch (error) {
        throw new InvalidExportDataError(
          `Failed to import area '${areaConfig.id}': ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  clear(): void {
    // Manter apenas áreas built-in
    const builtInIds = new Set(
      this.getBuiltInAreas().map((area) => area.id)
    );

    for (const areaId of this.areas.keys()) {
      if (!builtInIds.has(areaId)) {
        this.areas.delete(areaId);
      }
    }
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Valida a configuração de uma área
   * Garante que todos os campos obrigatórios estão presentes
   */
  private validatePluginConfig(plugin: AreaPluginConfig): void {
    // Validar ID
    if (!plugin.id || plugin.id.trim().length === 0) {
      throw new InvalidPluginConfigError('', 'id is required and must not be empty');
    }

    // ID deve conter apenas caracteres válidos (alphanumeric, underscore, dash)
    if (!/^[a-z0-9_-]+$/.test(plugin.id)) {
      throw new InvalidPluginConfigError(
        plugin.id,
        'id must contain only lowercase letters, numbers, underscores, or dashes'
      );
    }

    // Validar label
    if (!plugin.label || plugin.label.trim().length === 0) {
      throw new InvalidPluginConfigError(plugin.id, 'label is required');
    }

    // Validar icon
    if (!plugin.icon || plugin.icon.trim().length === 0) {
      throw new InvalidPluginConfigError(plugin.id, 'icon is required');
    }

    // Validar color
    if (!plugin.color || plugin.color.trim().length === 0) {
      throw new InvalidPluginConfigError(plugin.id, 'color is required');
    }

    // Validar isPublic
    if (typeof plugin.isPublic !== 'boolean') {
      throw new InvalidPluginConfigError(plugin.id, 'isPublic must be a boolean');
    }

    // Validar customFields se fornecido
    if (plugin.customFields) {
      if (!Array.isArray(plugin.customFields)) {
        throw new InvalidPluginConfigError(
          plugin.id,
          'customFields must be an array'
        );
      }

      for (const field of plugin.customFields) {
        this.validateFieldDefinition(plugin.id, field);
      }
    }

    // Validar rules se fornecido
    if (plugin.rules) {
      if (!Array.isArray(plugin.rules)) {
        throw new InvalidPluginConfigError(plugin.id, 'rules must be an array');
      }

      for (const rule of plugin.rules) {
        if (!rule.id || !rule.trigger || typeof rule.action !== 'function') {
          throw new InvalidPluginConfigError(
            plugin.id,
            'Each rule must have id, trigger, and action function'
          );
        }
      }
    }

    // Validar validators se fornecido
    if (plugin.validators) {
      if (typeof plugin.validators !== 'object') {
        throw new InvalidPluginConfigError(
          plugin.id,
          'validators must be an object'
        );
      }

      for (const [key, validator] of Object.entries(plugin.validators)) {
        if (typeof validator !== 'function') {
          throw new InvalidPluginConfigError(
            plugin.id,
            `Validator '${key}' must be a function`
          );
        }
      }
    }
  }

  /**
   * Valida a definição de um campo customizado
   */
  private validateFieldDefinition(
    areaId: string,
    field: any
  ): void {
    if (!field.name || field.name.trim().length === 0) {
      throw new InvalidPluginConfigError(areaId, 'Field name is required');
    }

    if (!field.label || field.label.trim().length === 0) {
      throw new InvalidPluginConfigError(areaId, 'Field label is required');
    }

    const validTypes = [
      'text',
      'number',
      'date',
      'select',
      'checkbox',
      'textarea',
    ];
    if (!validTypes.includes(field.type)) {
      throw new InvalidPluginConfigError(
        areaId,
        `Field '${field.name}' has invalid type '${field.type}'. Must be one of: ${validTypes.join(', ')}`
      );
    }

    if (typeof field.required !== 'boolean') {
      throw new InvalidPluginConfigError(
        areaId,
        `Field '${field.name}' must have required as boolean`
      );
    }

    // Se tipo é 'select', deve ter options
    if (field.type === 'select' && !Array.isArray(field.options)) {
      throw new InvalidPluginConfigError(
        areaId,
        `Field '${field.name}' of type 'select' must have options array`
      );
    }
  }
}
