import type { AssetId, ProjectId } from '../../domain/ids'
import type { ProjectEnvelope } from '../../domain/project'
import type { ToolId } from '../../domain/tool'

export interface ProjectRepository {
  put(project: ProjectEnvelope): Promise<void>
  get(id: ProjectId): Promise<ProjectEnvelope | undefined>
  list(tool?: ToolId): Promise<ProjectEnvelope[]>
  delete(id: ProjectId): Promise<void>
  /** Prosjekter som refererer til et asset (indeksert på `assets`). */
  usedBy(assetId: AssetId): Promise<ProjectId[]>
}
