const ROLE_LABELS = {
  lider: 'Líder',
  sub_lider: 'Sub-Líder',
  comandante: 'Comandante',
  ayudante: 'Ayudante',
  miembro: 'Miembro'
};

export default function RoleBadge({ role, size = 'sm' }) {
  const label = ROLE_LABELS[role] || role;
  const sizeClass = size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs';

  return (
    <span className={`role-badge role-${role} ${sizeClass}`}>
      {label}
    </span>
  );
}

export { ROLE_LABELS };
