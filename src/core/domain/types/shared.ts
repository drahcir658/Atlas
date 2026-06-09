/**
 * ATLAS - Tipos Compartilhados (Enums e Constantes)
 * Agnóstico de domínio
 * Usado por toda a aplicação
 */

// ============ ENUMS CENTRAIS ============

/**
 * Tipo de ciclo
 * UNIQUE: Uma única execução
 * RECURRING: Repetitivo (com padrão)
 */
export enum CycleType {
  UNIQUE = 'unique',
  RECURRING = 'recurring',
}

/**
 * Padrão de recorrência de ciclos
 * Define como um ciclo repetitivo se comporta
 */
export enum RecurrencePattern {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = '90days',
  CUSTOM = 'custom',
}

/**
 * Estados possíveis de um ciclo, missão ou registro
 * Fluxo: pending → in_progress → completed (ou overdue/cancelled)
 */
export enum RecordStatus {
  PENDING = 'pending',           // Aguardando iniciar
  IN_PROGRESS = 'in_progress',   // Em execução
  COMPLETED = 'completed',       // Finalizado com sucesso
  OVERDUE = 'overdue',          // Atrasado
  CANCELLED = 'cancelled',       // Cancelado
}

/**
 * Gênero do usuário
 * Usado para personalização (pronomes, etc.)
 */
export enum GenderType {
  MALE = 'M',
  FEMALE = 'F',
  OTHER = 'O',
}

/**
 * Tipo de mídia em um registro
 * Limites: vídeo até 30s
 */
export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
}

/**
 * Nível de acesso em compartilhamentos
 */
export enum AccessLevel {
  VIEW_ONLY = 'view_only',    // Apenas visualizar
  COMMENT = 'comment',        // Visualizar + comentar
  EDIT = 'edit',              // Editar completo
}

/**
 * Status de relacionamento entre pessoas
 */
export enum FriendshipStatus {
  CONNECTED = 'connected',
  PENDING = 'pending',
  BLOCKED = 'blocked',
}

// ============ TIPOS HELPER ============

/**
 * Tipo de arquivo de mídia aceito
 */
export type AcceptedMediaType = 'photo' | 'video';

/**
 * Tipo genérico para respostas da API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Tipo para paginação
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Timestamp padrão para audit
 */
export interface AuditTimestamps {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Resposta genérica com metadata
 */
export interface ResponseWithMetadata<T> {
  data: T;
  metadata: Record<string, unknown>;
}
