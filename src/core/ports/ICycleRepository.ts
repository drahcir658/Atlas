/**
 * ATLAS - Interface de Repositório de Ciclos
 * Define o contrato para persistência de ciclos no banco de dados
 * Agnóstico de implementação: pode usar Supabase, PostgreSQL, MongoDB, etc.
 */

import { Cycle, Mission, Record } from '../domain/types';

/**
 * ICycleRepository: Porta para persistência de ciclos
 *
 * Responsabilidades:
 * - CREATE: Criar novos ciclos
 * - READ: Buscar ciclos por ID, pessoa, área
 * - UPDATE: Atualizar ciclos existentes
 * - DELETE: Deletar ciclos (soft delete)
 * - RELATIONSHIPS: Gerenciar relacionamentos (missões, amigos, etc.)
 *
 * Implementações:
 * - SupabaseCycleRepository: PostgreSQL via Supabase
 * - MockCycleRepository: Para testes
 * - InMemoryCycleRepository: Para desenvolvimento local
 */
export interface ICycleRepository {
  // ============ CREATE ============

  /**
   * Cria um novo ciclo no repositório
   *
   * @param cycle Ciclo a ser criado (sem ID, createdAt, updatedAt)
   * @returns Ciclo criado com ID, timestamps preenchidos
   * @throws PersistenceError se falhar ao salvar
   *
   * @example
   * const cycle = await repository.create({
   *   personId: 'user-123',
   *   title: 'Lançar Produto',
   *   type: 'unique',
   *   startDate: new Date(),
   *   status: 'pending',
   *   missionIds: [],
   *   metadata: {}
   * });
   */
  create(
    cycle: Omit<Cycle, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Cycle>;

  // ============ READ ============

  /**
   * Busca um ciclo pelo ID
   *
   * @param id ID do ciclo
   * @returns Ciclo encontrado ou null se não existir
   * @throws PersistenceError se falhar ao buscar
   */
  findById(id: string): Promise<Cycle | null>;

  /**
   * Lista todos os ciclos de uma pessoa
   *
   * @param personId ID da pessoa
   * @returns Array de ciclos (pode ser vazio)
   * @throws PersistenceError se falhar ao buscar
   */
  findByPersonId(personId: string): Promise<Cycle[]>;

  /**
   * Lista todos os ciclos de uma área específica
   *
   * @param areaId ID da área
   * @returns Array de ciclos da área (pode ser vazio)
   * @throws PersistenceError se falhar ao buscar
   */
  findByAreaId(areaId: string): Promise<Cycle[]>;

  /**
   * Lista ciclos públicos (sem área específica)
   * Usados para evitar tela vazia em novos usuários
   * Exemplos: "Café Atlas", "Leitura Coletiva"
   *
   * @returns Array de ciclos públicos
   * @throws PersistenceError se falhar ao buscar
   */
  findPublic(): Promise<Cycle[]>;

  /**
   * Lista ciclos filtrados por múltiplos critérios
   * Agnóstico: permite queries customizadas
   *
   * @param filters Filtros a aplicar
   * @returns Array de ciclos que combinam os filtros
   * @throws PersistenceError se falhar ao buscar
   */
  findByFilters(filters: CycleFilters): Promise<Cycle[]>;

  // ============ UPDATE ============

  /**
   * Atualiza um ciclo existente
   * Apenas campos fornecidos são atualizados (partial update)
   *
   * @param id ID do ciclo a atualizar
   * @param data Dados parciais a atualizar
   * @returns Ciclo atualizado
   * @throws NotFoundError se ciclo não existir
   * @throws PersistenceError se falhar ao salvar
   */
  update(
    id: string,
    data: Partial<Omit<Cycle, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Cycle>;

  /**
   * Atualiza o status de um ciclo
   * Atalho conveniente para operação comum
   *
   * @param id ID do ciclo
   * @param status Novo status
   * @returns Ciclo atualizado
   * @throws NotFoundError se ciclo não existir
   * @throws PersistenceError se falhar ao salvar
   */
  updateStatus(id: string, status: string): Promise<Cycle>;

  /**
   * Adiciona uma missão ao ciclo
   * Atualiza o array missionIds
   *
   * @param cycleId ID do ciclo
   * @param missionId ID da missão a adicionar
   * @returns Ciclo atualizado
   * @throws NotFoundError se ciclo não existir
   * @throws PersistenceError se falhar ao salvar
   */
  addMission(cycleId: string, missionId: string): Promise<Cycle>;

  /**
   * Remove uma missão do ciclo
   * Atualiza o array missionIds
   *
   * @param cycleId ID do ciclo
   * @param missionId ID da missão a remover
   * @returns Ciclo atualizado
   * @throws NotFoundError se ciclo não existir
   * @throws PersistenceError se falhar ao salvar
   */
  removeMission(cycleId: string, missionId: string): Promise<Cycle>;

  /**
   * Adiciona um amigo ao ciclo (para órbita)
   * Atualiza o array friendIds
   *
   * @param cycleId ID do ciclo
   * @param friendId ID do amigo a adicionar
   * @returns Ciclo atualizado
   * @throws NotFoundError se ciclo não existir
   * @throws PersistenceError se falhar ao salvar
   */
  addFriend(cycleId: string, friendId: string): Promise<Cycle>;

  /**
   * Remove um amigo do ciclo
   * Atualiza o array friendIds
   *
   * @param cycleId ID do ciclo
   * @param friendId ID do amigo a remover
   * @returns Ciclo atualizado
   * @throws NotFoundError se ciclo não existir
   * @throws PersistenceError se falhar ao salvar
   */
  removeFriend(cycleId: string, friendId: string): Promise<Cycle>;

  // ============ DELETE ============

  /**
   * Deleta um ciclo (soft delete)
   * Marca deletedAt como agora, sem remover do BD
   *
   * @param id ID do ciclo a deletar
   * @throws NotFoundError se ciclo não existir
   * @throws PersistenceError se falhar ao salvar
   */
  delete(id: string): Promise<void>;

  /**
   * Deleta um ciclo permanentemente (hard delete)
   * Remove completamente do banco de dados
   * CUIDADO: Operação irreversível
   *
   * @param id ID do ciclo a deletar
   * @throws NotFoundError se ciclo não existir
   * @throws PersistenceError se falhar ao deletar
   */
  hardDelete(id: string): Promise<void>;

  // ============ RELATIONSHIPS ============

  /**
   * Busca todas as missões de um ciclo
   *
   * @param cycleId ID do ciclo
   * @returns Array de missões (pode ser vazio)
   * @throws PersistenceError se falhar ao buscar
   */
  getMissions(cycleId: string): Promise<Mission[]>;

  /**
   * Busca todos os registros de um ciclo
   *
   * @param cycleId ID do ciclo
   * @returns Array de registros (pode ser vazio)
   * @throws PersistenceError se falhar ao buscar
   */
  getRecords(cycleId: string): Promise<Record[]>;

  /**
   * Busca todos os amigos compartilhando um ciclo
   *
   * @param cycleId ID do ciclo
   * @returns Array de IDs de amigos (pode ser vazio)
   * @throws PersistenceError se falhar ao buscar
   */
  getFriendIds(cycleId: string): Promise<string[]>;

  /**
   * Busca o ciclo pai (se houver subciclos)
   *
   * @param cycleId ID do ciclo
   * @returns Ciclo pai ou null
   * @throws PersistenceError se falhar ao buscar
   */
  getParentCycle(cycleId: string): Promise<Cycle | null>;

  /**
   * Busca todos os subciclos de um ciclo
   *
   * @param parentCycleId ID do ciclo pai
   * @returns Array de subciclos (pode ser vazio)
   * @throws PersistenceError se falhar ao buscar
   */
  getSubCycles(parentCycleId: string): Promise<Cycle[]>;

  // ============ STATISTICS ============

  /**
   * Conta ciclos de uma pessoa
   *
   * @param personId ID da pessoa
   * @returns Número total de ciclos
   * @throws PersistenceError se falhar ao contar
   */
  countByPersonId(personId: string): Promise<number>;

  /**
   * Conta ciclos em uma área
   *
   * @param areaId ID da área
   * @returns Número total de ciclos
   * @throws PersistenceError se falhar ao contar
   */
  countByAreaId(areaId: string): Promise<number>;

  /**
   * Conta ciclos por status para uma pessoa
   *
   * @param personId ID da pessoa
   * @returns Objeto com contagem por status
   * @throws PersistenceError se falhar ao contar
   */
  countByStatusForPerson(
    personId: string
  ): Promise<Record<string, number>>;
}

/**
 * CycleFilters: Critérios para buscar ciclos
 * Permite queries customizadas e agnósticas
 */
export interface CycleFilters {
  personId?: string; // Filtrar por pessoa
  areaId?: string; // Filtrar por área
  status?: string; // Filtrar por status
  type?: string; // Filtrar por tipo (unique/recurring)
  startDateFrom?: Date; // Ciclos que começam após esta data
  startDateTo?: Date; // Ciclos que começam antes desta data
  isPublic?: boolean; // Apenas públicos (areaId === null)
  excludeDeleted?: boolean; // Excluir soft-deleted (default: true)
  limit?: number; // Limitar resultados
  offset?: number; // Para paginação
}

/**
 * CycleRepositoryError: Erro genérico de repositório
 * Base para erros específicos de persistência
 */
export class CycleRepositoryError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CycleRepositoryError';
  }
}

/**
 * NotFoundError: Ciclo não encontrado
 */
export class NotFoundError extends CycleRepositoryError {
  constructor(cycleId: string) {
    super('NOT_FOUND', `Cycle '${cycleId}' not found`, { cycleId });
    this.name = 'NotFoundError';
  }
}

/**
 * PersistenceError: Erro ao persistir dados
 */
export class PersistenceError extends CycleRepositoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PERSISTENCE_ERROR', message, details);
    this.name = 'PersistenceError';
  }
}
