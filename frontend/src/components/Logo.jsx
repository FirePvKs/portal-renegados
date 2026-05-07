export default function Logo({ size = 40, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="Renegados"
      width={size}
      height={size}
      className={className}
      style={{
        height: size,
        width: 'auto',
        objectFit: 'contain'
      }}
    />
  );
}
