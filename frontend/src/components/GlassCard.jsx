export default function GlassCard({
  children,
  className = '',
  variant = 'default',
  hover = true,
  ...props
}) {
  const variants = {
    default: 'glass',
    light: 'glass-light',
    accent: 'glass-accent',
  };

  return (
    <div
      className={`${variants[variant]} rounded-2xl p-5 transition-all duration-300 ${
        hover ? 'hover:border-white/10 hover:translate-y-[-2px]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
