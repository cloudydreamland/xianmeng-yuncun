interface Props {
  label: string;
  tone?: 'green' | 'teal' | 'brown' | 'yellow';
}

export default function IslandTag({ label, tone = 'teal' }: Props) {
  return <span className={`island-tag island-tag--${tone}`}>{label}</span>;
}
