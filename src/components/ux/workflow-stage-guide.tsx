type WorkflowStage = {
  label: string;
  description?: string;
  state?: 'done' | 'current' | 'next';
};

export function WorkflowStageGuide({
  stages,
  ariaLabel = 'مراحل الإجراء',
}: {
  stages: WorkflowStage[];
  ariaLabel?: string;
}) {
  return (
    <nav className="ux-stage-guide" aria-label={ariaLabel}>
      {stages.map((stage, index) => (
        <div className={`ux-stage-guide__item is-${stage.state ?? 'next'}`} key={`${stage.label}-${index}`}>
          <span className="ux-stage-guide__index" aria-hidden="true">{index + 1}</span>
          <span className="ux-stage-guide__copy">
            <strong>{stage.label}</strong>
          </span>
        </div>
      ))}
    </nav>
  );
}
