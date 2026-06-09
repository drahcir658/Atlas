/**
 * ATLAS - Tipos Centrais do Core
 * Motor agnóstico de ciclos
 * Pessoa → Objetivo → Ciclo → Missões → Registro → Compartilhamento → Histórico
 */

import {
  CycleType,
  RecurrencePattern,
  RecordStatus,
  GenderType,
  MediaType,
  AccessLevel,
  FriendshipStatus,
  AuditTimestamps,
} from './shared';

// ============ ENTIDADE: PERSON ============

/**
 * Person: Usuário do sistema
 * Armazena dados básicos e escolha de área
 * AGNÓSTICO: Não assume nenhuma área específica
 */
export interface Person extends AuditTimestamps {
  id: string;
  name: string;
  email: string;
  selectedAreaId: string; // Referência a AreaPlugin registrada
  gender: GenderType;
  avatar?: string; // URL da foto de perfil
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============ ENTIDADE: AREA ============

/**
 * Area: Domínio/Categoria do usuário (Finance, Academia, Família, etc.)
 * AGNÓSTICO: Pode ser criado dinamicamente ou pré-registrado
 */
export interface Area extends AuditTimestamps {
  id: string; // Identificador único (ex: 'finance', 'academy')
  label: string; // Nome legível (ex: 'Finanças', 'Academia')
  icon: string; // URL ou emoji (ex: '💰', 'https://...')
  color: string; // Cor HEX (ex: '#4CAF50')
  isPublic: boolean; // Se suporta ciclos públicos
  ownerId?: string; // Quem criou (null = built-in)
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============ ENTIDADE: CYCLE (CORAÇÃO DO MOTOR) ============

/**
 * Cycle: Unidade central do Atlas
 * Ciclo = Objetivo contendo Missões, que contêm Registros
 * CRÍTICO: Agnóstico de área
 * Fluxo: Pessoa → Seleciona Objetivo → Cria Ciclo → Define Missões → Registra Compromissos
 */
export interface Cycle extends AuditTimestamps {
  id: string;
  personId: string; // Quem criou este ciclo

  // Identificação
  title: string;
  description?: string;
  areaId?: string; // Opcional: ciclos públicos (null) ou pertencentes a uma área específica

  // Tipo e recorrência
  type: CycleType; // 'unique' ou 'recurring'
  pattern?: RecurrencePattern; // Se recurring: 'daily', 'weekly', 'monthly', '90days', 'custom'
  customPattern?: string; // Padrão customizado (ex: "a cada 3 semanas")

  // Datas
  startDate: Date; // Quando o ciclo começa
  endDate?: Date; // Quando o ciclo encerra (pode não ter, para recurring)
  expectedCompletionDate?: Date; // Data estimada de conclusão

  // Estado
  status: RecordStatus; // pending, in_progress, completed, overdue, cancelled

  // Relacionamentos
  parentCycleId?: string; // Para subciclos (ciclos aninhados)
  missionIds: string[]; // IDs das missões dentro deste ciclo
  friendIds?: string[]; // Amigos compartilhando este ciclo (para órbita)

  // Metadata agnóstica (extensível para plugins de áreas)
  metadata: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============ ENTIDADE: MISSION ============

/**
 * Mission: Etapa dentro de um ciclo
 * Missões quebram o ciclo em passos menores
 * Exemplo: Ciclo "Lançar Produto" → Missões "Design", "Desenvolvimento", "Marketing"
 */
export interface Mission extends AuditTimestamps {
  id: string;
  cycleId: string; // Ciclo pai

  // Identificação
  title: string;
  description?: string;

  // Ordem e hierarquia
  sequenceNumber: number; // Ordem de execução (1, 2, 3...)
  dependsOnMissionId?: string; // Missão que precisa ser completa antes desta

  // Estado
  status: RecordStatus;
  dueDate?: Date;

  // Relacionamentos
  recordIds: string[]; // Registros (compromissos) dentro desta missão

  // Metadata agnóstica
  metadata: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============ ENTIDADE: RECORD (REGISTRO/COMPROMISSO) ============

/**
 * Record: Registro de uma troca/compromisso
 * É o nível mais granular: Ciclo → Missão → Record
 * CRÍTICO: Toda edição deixa rastro de auditoria
 * Suporta: descrição, fotos, vídeos (até 30s), compartilhamento
 */
export interface Record extends AuditTimestamps {
  id: string;
  missionId: string; // Missão pai
  cycleId: string; // Ciclo pai (denormalizado para query rápida)
  personId: string; // Quem criou este registro

  // Conteúdo
  title: string;
  description?: string;
  status: RecordStatus;
  dueDate?: Date;

  // Multimídia
  mediaUrls?: Media[];

  // Rastreamento de edições (OBRIGATÓRIO!)
  editHistory: EditHistoryEntry[];

  // Compartilhamento
  isShared: boolean;
  shareCode?: string; // Código único para link público
  viewedByIds?: string[]; // Quem visualizou (para monitoramento)

  // Metadata agnóstica
  metadata: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Media: Arquivo de mídia associado a um registro
 * Fotos: sem limite de tamanho
 * Vídeos: máximo 30 segundos
 */
export interface Media {
  id: string;
  url: string;
  type: MediaType; // 'photo' ou 'video'
  uploadedAt: Date;
  fileName?: string;
  fileSize?: number;
  duration?: number; // Duração em segundos (para vídeos)
}

/**
 * EditHistoryEntry: Rastreamento de mudanças
 * Obrigatório inserir "editReason" quando editar
 * Permite auditoria completa do ciclo
 */
export interface EditHistoryEntry {
  id: string;
  recordId: string;
  editedBy: string; // ID da pessoa que editou
  editedAt: Date;
  previousValue: unknown; // Valor anterior
  newValue: unknown; // Novo valor
  fieldName: string; // Qual campo foi editado
  editReason: string; // OBRIGATÓRIO: por que editou?
}

// ============ ENTIDADE: FRIEND (RELACIONAMENTO) ============

/**
 * Friend: Relacionamento entre pessoas
 * Usado para: órbita (visualização), compartilhamento, notificações
 */
export interface Friend extends AuditTimestamps {
  id: string;
  personId: string; // Pessoa 1
  friendPersonId: string; // Pessoa 2
  status: FriendshipStatus; // 'connected', 'pending', 'blocked'
  sharedCycleIds: string[]; // Ciclos compartilhados entre eles
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============ ENTIDADE: CYCLE_SHARE ============

/**
 * CycleShare: Controle de visibilidade e compartilhamento
 * Permite que diferentes pessoas vejam o mesmo ciclo com níveis diferentes de acesso
 * Casos de uso:
 *   - Dono do comércio + Cliente vendo progresso
 *   - Grupo compartilhando ciclo público (Café Atlas)
 */
export interface CycleShare extends AuditTimestamps {
  id: string;
  cycleId: string;
  shareCode: string; // Código único para link público (ex: "abc123xyz")
  ownerPersonId: string; // Quem criou o compartilhamento
  clientPersonId?: string; // Se compartilhado com pessoa específica (null = público)
  accessLevel: AccessLevel; // 'view_only', 'comment', 'edit'
  expiresAt?: Date; // Data de expiração do compartilhamento
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============ TIPOS PARA PLUGIN SYSTEM ============

/**
 * FieldDefinition: Define campos customizados de uma área
 * Permite que plugins (Finance, Academia, etc.) tenham campos específicos
 */
export interface FieldDefinition {
  name: string; // ID do campo (ex: 'amount', 'studentId')
  label: string; // Rótulo legível (ex: 'Valor ($)', 'Matrícula')
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string }>; // Para tipo 'select'
}

/**
 * BusinessRule: Regra de negócio específica de uma área
 * Gatilhos automáticos (ex: notificar se valor > 1000)
 */
export interface BusinessRule {
  id: string;
  trigger: 'onCycleCreate' | 'onMissionComplete' | 'onRecordEdit';
  action: (data: unknown, context: unknown) => Promise<void>;
}

/**
 * AreaPluginConfig: Configuração de uma área no sistema
 * Define campos, regras, validadores específicos
 * AGNÓSTICO: sistema não assume nada, tudo é plugin
 */
export interface AreaPluginConfig {
  id: string; // ID único (ex: 'finance', 'academy', 'custom_myarea')
  label: string; // Nome legível
  icon: string; // Emoji ou URL
  color: string; // Cor HEX
  isPublic: boolean; // Suporta ciclos públicos?

  // Extensibilidade
  customFields?: FieldDefinition[];
  rules?: BusinessRule[];
  validators?: Record<string, (value: unknown) => boolean>;
  
  // Metadata
  isBuiltIn?: boolean; // true = vem com o sistema, false = criado pelo usuário
}

// ============ TIPOS PARA RESPOSTA DE API ============

/**
 * Dto para criar um ciclo
 * Input simplificado (sem IDs de relacionamentos)
 */
export interface CreateCycleInput {
  title: string;
  description?: string;
  areaId?: string;
  type: CycleType;
  pattern?: RecurrencePattern;
  startDate: Date;
  endDate?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Dto para editar um ciclo
 */
export interface UpdateCycleInput {
  title?: string;
  description?: string;
  status?: RecordStatus;
  endDate?: Date;
  expectedCompletionDate?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Dto para criar um registro
 */
export interface CreateRecordInput {
  missionId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  mediaUrls?: Media[];
  metadata?: Record<string, unknown>;
}

/**
 * Dto para editar um registro
 * CRÍTICO: editReason é obrigatório!
 */
export interface UpdateRecordInput {
  title?: string;
  description?: string;
  status?: RecordStatus;
  dueDate?: Date;
  mediaUrls?: Media[];
  editReason: string; // OBRIGATÓRIO
  metadata?: Record<string, unknown>;
}

// ============ EXPORTAÇÕES ============

// Re-exportar enums e tipos compartilhados para conveniência
export {
  CycleType,
  RecurrencePattern,
  RecordStatus,
  GenderType,
  MediaType,
  AccessLevel,
  FriendshipStatus,
  AuditTimestamps,
} from './shared';
