import type { Equipment, PipeConfig } from "@/types/factory-twin";
import type { ProductionLineConfig, ValidationResult, ValidationMessage } from "@/types/editor";

export function validateLayout(
  equipment: Equipment[],
  pipes: PipeConfig[],
  productionLines: ProductionLineConfig[],
): ValidationResult {
  const errors: ValidationMessage[] = [];
  const warnings: ValidationMessage[] = [];

  // 1. Duplicate IDs
  const ids = new Set<string>();
  for (const eq of equipment) {
    if (ids.has(eq.id)) {
      errors.push({ level: "error", message: `Duplicate equipment ID: ${eq.id}`, equipmentId: eq.id });
    }
    ids.add(eq.id);
  }

  // 2. Overlap detection (equipment within 2m of each other)
  for (let i = 0; i < equipment.length; i++) {
    for (let j = i + 1; j < equipment.length; j++) {
      const a = equipment[i];
      const b = equipment[j];
      const dx = a.position[0] - b.position[0];
      const dz = a.position[2] - b.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 2) {
        warnings.push({
          level: "warning",
          message: `${a.id} and ${b.id} are overlapping (${dist.toFixed(1)}m apart)`,
          equipmentId: a.id,
        });
      }
    }
  }

  // 3. Orphan pipes — endpoint references missing equipment
  for (const pipe of pipes) {
    if (!equipment.find((e) => e.id === pipe.from)) {
      errors.push({ level: "error", message: `Pipe ${pipe.id}: source "${pipe.from}" not found`, pipeId: pipe.id });
    }
    if (!equipment.find((e) => e.id === pipe.to)) {
      errors.push({ level: "error", message: `Pipe ${pipe.id}: target "${pipe.to}" not found`, pipeId: pipe.id });
    }
  }

  // 4. Disconnected equipment — no pipes connected
  const connectedIds = new Set<string>();
  for (const pipe of pipes) {
    connectedIds.add(pipe.from);
    connectedIds.add(pipe.to);
  }
  for (const eq of equipment) {
    if (!connectedIds.has(eq.id)) {
      warnings.push({
        level: "warning",
        message: `${eq.id} (${eq.label}) has no pipe connections`,
        equipmentId: eq.id,
      });
    }
  }

  // 5. Missing ERPNext links
  for (const eq of equipment) {
    if (!eq.linkedWorkstation && !eq.linkedWarehouse) {
      warnings.push({
        level: "warning",
        message: `${eq.id} has no ERPNext link (workstation or warehouse)`,
        equipmentId: eq.id,
      });
    }
  }

  // 6. Empty production lines
  for (const line of productionLines) {
    if (line.stages.length === 0) {
      warnings.push({ level: "warning", message: `Production line "${line.name}" has no stages` });
    }
    for (const stageId of line.stages) {
      if (!equipment.find((e) => e.id === stageId)) {
        errors.push({ level: "error", message: `Production line "${line.name}": stage "${stageId}" not found` });
      }
    }
  }

  // 7. Duplicate pipe IDs
  const pipeIds = new Set<string>();
  for (const pipe of pipes) {
    if (pipeIds.has(pipe.id)) {
      errors.push({ level: "error", message: `Duplicate pipe ID: ${pipe.id}`, pipeId: pipe.id });
    }
    pipeIds.add(pipe.id);
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
